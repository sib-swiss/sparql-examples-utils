package swiss.sib.rdf.sparql.examples.qlever.probe;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.PolyglotException;
import org.graalvm.polyglot.Source;
import org.graalvm.polyglot.Value;
import org.graalvm.polyglot.io.ByteSequence;
import org.graalvm.polyglot.proxy.ProxyArray;
import org.graalvm.polyglot.proxy.ProxyExecutable;
import org.graalvm.polyglot.proxy.ProxyObject;

/**
 * Standalone, throwaway probe (not part of the sparql-examples-utils test
 * suite) for working through QLever's WASM binary one GraalWasm error at a
 * time.
 *
 * <h2>Where this is in the process</h2>
 *
 * <ol>
 * <li>Phase 1 — {@code context.eval(source)}: parse + validate. Passed once
 * {@code wasm.Memory64}, {@code wasm.UseUnsafeMemory} and {@code
 * wasm.Threads} were enabled and GraalWasm was upgraded to a release with
 * table64 support (26.3.4.1 at the time of writing).</li>
 * <li>Phase 2 — {@code module.newInstance()}: this is where import
 * resolution happens. With zero imports registered, this failed with
 * "The module 'a', referenced in the import of memory 'a' in module
 * 'qlever', does not exist" — i.e. GraalWasm needs something registered
 * under the binding name {@code a} (the single, minified import namespace
 * every one of QLever's 96 imports live under — see the {@code wasmImports}
 * map extracted from {@code qlever.mjs}) before it will instantiate.</li>
 * </ol>
 *
 * <h2>What this version does about that</h2>
 *
 * Per GraalWasm's own docs, an import from module {@code foo} is resolved
 * against "the module whose Source was named foo" — i.e. imports are
 * satisfied by other *evaluated modules' exports*, not built ad hoc. There
 * is no documented Java-side constructor for a standalone Memory value, so:
 *
 * <ol>
 * <li>A tiny (26-byte) hand-assembled satellite Wasm module is evaluated
 * first. Its only content is a Memory section declaring exactly the shape
 * QLever's import expects — shared, 64-bit, min=1024/max=131072 pages,
 * confirmed via the accompanying {@code print_memory_limits.py} script
 * against the real binary — and an Export section exporting it as
 * {@code "mem"}. This gives us a real GraalWasm {@code Memory} {@link
 * Value} via completely ordinary module evaluation.</li>
 * <li>A {@link ProxyObject} is registered as the {@code a} binding. For the
 * one member key that matches the memory import's name, it returns the
 * real memory Value from step 1. For every other key (i.e. every one of
 * the ~95 function imports), it returns a generic stub {@link
 * ProxyExecutable} that logs the call and returns {@code 0}, so we get
 * structurally past {@code newInstance()} without hand-writing all 95
 * function stubs up front.</li>
 * </ol>
 *
 * <h2>What to expect next</h2>
 *
 * Per GraalWasm's docs, function imports "are not resolved until... a
 * WebAssembly module instance's members are accessed or executed for the
 * first time" — unlike the memory import, which was resolved eagerly during
 * {@code newInstance()}. That means instantiation itself may now succeed
 * outright; real failures (or wrong-typed-stub-return errors) would only
 * surface once the module's start function or an actual {@code
 * buildIndex}/{@code query} call path exercises a specific import. If/when
 * that happens, the printed STUB CALL log line tells you exactly which of
 * the 95 imports is the next one to implement for real, rather than having
 * to guess from the full list.
 */
public final class GraalWasmQLeverProbe {

	/**
	 * Hand-assembled minimal Wasm module: magic+version, a Memory section
	 * declaring one memory (flags=0x07 -> shared + 64-bit + has-max,
	 * min=1024 pages, max=131072 pages), and an Export section exporting it
	 * as "mem". No Type/Function/Code sections needed since there are no
	 * functions.
	 *
	 * Regenerate this if print_memory_limits.py ever reports different
	 * numbers against a newer qlever.wasm — the encoding is plain ULEB128,
	 * see the comments below for how each byte was derived.
	 */
	private static final byte[] MEMORY_PROVIDER_WASM = {
			// magic "\0asm", version 1
			0x00, 0x61, 0x73, 0x6D, 0x01, 0x00, 0x00, 0x00,
			// Memory section (id=5), size=7 bytes of content
			0x05, 0x07,
			0x01, // count: 1 memory
			0x07, // limits flags: 0x04 (is64) | 0x02 (shared) | 0x01 (has max)
			(byte) 0x80, 0x08, // min=1024, ULEB128: 0x80 0x08
			(byte) 0x80, (byte) 0x80, 0x08, // max=131072, ULEB128: 0x80 0x80 0x08
			// Export section (id=7), size=7 bytes of content
			0x07, 0x07,
			0x01, // count: 1 export
			0x03, 0x6D, 0x65, 0x6D, // name length 3, "mem"
			0x02, // export kind: memory
			0x00 // export index: 0
	};

	private static final String MEMORY_IMPORT_NAME = "a"; // from print_memory_limits.py: MEMORY a.a

	public static void main(String[] args) throws IOException {
		if (args.length != 1) {
			System.err.println("Usage: GraalWasmQLeverProbe <path-to-qlever.wasm>");
			System.exit(2);
		}
		Path wasmPath = Path.of(args[0]);
		if (!Files.exists(wasmPath)) {
			System.err.println("No such file: " + wasmPath);
			System.exit(2);
		}

		System.out.println("== GraalWasm QLever probe ==");
		System.out.println("File: " + wasmPath.toAbsolutePath());
		System.out.println("Size: " + Files.size(wasmPath) + " bytes");
		System.out.println();

		try (Context context = Context.newBuilder("wasm")
				.allowExperimentalOptions(true)
				.option("wasm.Memory64", "true")
				.option("wasm.UseUnsafeMemory", "true")
				.option("wasm.Threads", "true")
				.option("wasm.Exceptions", "true")
				.build()) {

			System.out.println("-- Step 0: evaluate the satellite memory-provider module --");
			Source memSource = Source.newBuilder("wasm", ByteSequence.create(MEMORY_PROVIDER_WASM), "memprovider")
					.build();
			Value memModule = context.eval(memSource);
			Value memInstance = memModule.newInstance();
			Value sharedMemory = memInstance.getMember("mem");
			System.out.println("OK — got a real Memory value: " + sharedMemory);
			System.out.println();

			System.out.println("-- Step 1: register the stub-everything 'a' import module --");
			ConcurrentMap<String, Long> stubCallCounts = new ConcurrentHashMap<>();
			context.getBindings("wasm").putMember(MEMORY_IMPORT_NAME,
					new StubImportModule(sharedMemory, stubCallCounts));
			System.out.println("Registered. Every import from module '" + MEMORY_IMPORT_NAME
					+ "' now resolves to either the real shared memory or a logging stub.");
			System.out.println();

			Source source = Source.newBuilder("wasm", wasmPath.toFile()).name("qlever").build();

			System.out.println("-- Phase 1: parse + validate (context.eval) --");
			Value module;
			long t0 = System.nanoTime();
			try {
				module = context.eval(source);
			} catch (PolyglotException e) {
				System.out.println("FAILED to parse/validate.");
				System.out.println("Message: " + e.getMessage());
				return;
			}
			long t1 = System.nanoTime();
			System.out.printf("OK — parsed and validated in %.1f s%n", (t1 - t0) / 1e9);
			System.out.println();

			System.out.println("-- Phase 2: instantiate, with the memory import satisfied and --");
			System.out.println("   every function import backed by a logging stub --");
			try {
				long t2 = System.nanoTime();
				Value instance = module.newInstance();
				long t3 = System.nanoTime();
				System.out.printf("SUCCEEDED in %.1f s%n", (t3 - t2) / 1e9);
				System.out.println("Instance value: " + instance);
				System.out.println();
				System.out.println("Exported member keys:");
				for (String key : instance.getMemberKeys()) {
					System.out.println("  " + key);
				}
			} catch (PolyglotException e) {
				System.out.println("Failed to instantiate.");
				System.out.println("Message: " + e.getMessage());
			} finally {
				if (!stubCallCounts.isEmpty()) {
					System.out.println();
					System.out.println("Stub imports that were actually called during instantiation:");
					stubCallCounts.forEach((name, count) -> System.out.println("  " + name + " x" + count));
					System.out.println("(These are the ones worth implementing for real first —");
					System.out.println(" everything else in the 96-import list may be dead code for");
					System.out.println(" this code path.)");
				} else {
					System.out.println();
					System.out.println("No stub imports were called yet (consistent with function imports");
					System.out.println("resolving lazily on first access/execution, not at instantiation");
					System.out.println("time). They'll show up once something actually calls into the");
					System.out.println("module, e.g. running its start function or calling an export.");
				}
			}

		} catch (PolyglotException e) {
			System.out.println("Context/engine-level failure (e.g. rejected options):");
			System.out.println(e.getMessage());
		}
	}

	/**
	 * Backs the {@code a} import module. Returns the one real memory value
	 * for the memory import's name, and a logging/no-op stub for every
	 * other key. Deliberately permissive about which keys it claims to
	 * have ({@link #hasMember} always returns true) since we don't have
	 * the full 95-name list enumerated — GraalWasm resolves each import by
	 * direct name lookup, not by first calling {@link #getMemberKeys()},
	 * so this is enough to get past linking.
	 */
	private static final class StubImportModule implements ProxyObject {

		private final Value sharedMemory;
		private final ConcurrentMap<String, Long> callCounts;

		StubImportModule(Value sharedMemory, ConcurrentMap<String, Long> callCounts) {
			this.sharedMemory = sharedMemory;
			this.callCounts = callCounts;
		}

		@Override
		public Object getMember(String key) {
			if (key.equals(MEMORY_IMPORT_NAME)) {
				return sharedMemory;
			}
			return (ProxyExecutable) arguments -> {
				callCounts.merge(key, 1L, Long::sum);
				System.out.println(
						"[stub] called import '" + key + "' with " + arguments.length + " argument(s)");
				// NOTE: this return value is untyped from our side. If
				// GraalWasm complains about a type mismatch here (e.g. the
				// real import signature wants f64 and we handed back an
				// int), that specific import needs a typed stub instead
				// of this generic one -- the error message will name
				// which key needs it.
				return 0;
			};
		}

		@Override
		public Object getMemberKeys() {
			// Cosmetic only -- see class javadoc. Real resolution is by
			// direct getMember(name) lookup.
			return ProxyArray.fromArray(MEMORY_IMPORT_NAME);
		}

		@Override
		public boolean hasMember(String key) {
			return true;
		}

		@Override
		public void putMember(String key, Value value) {
			throw new UnsupportedOperationException(
					"The guest module should not be writing into its own imports: " + key);
		}
	}
}
