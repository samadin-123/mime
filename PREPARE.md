# Evaluation Setup

This file is outside the editable surface. It defines how results are judged. Agents cannot modify the evaluator or the scoring logic — the evaluation is the trust boundary.

Consider defining more than one evaluation criterion. Optimizing for a single number makes it easy to overfit and silently break other things. A secondary metric or sanity check helps keep the process honest.

eval_cores: 1
eval_memory_gb: 1.0
prereq_command: npm run build

## Setup

Install dependencies and prepare the evaluation environment:

```bash
npm install
npm run build
```

The project is a TypeScript library that compiles to JavaScript in the `dist/` directory. The `prereq_command` is set to `npm run build` to ensure the benchmark always measures the latest compiled output.

## Run command

```bash
node --expose-gc dist/scripts/benchmark.js
```

## Output format

The benchmark must print `ops_per_sec=<number>` to stdout.

## Metric parsing

The CLI looks for `METRIC=<number>` or `ops_per_sec=<number>` in the output.

## Ground truth

The baseline metric measures the throughput of MIME type operations (getType and getExtension) on the compiled JavaScript output. The benchmark performs a mix of common operations:

- **getType()** - Extract MIME type from file paths/extensions (e.g., "file.txt" → "text/plain")
- **getExtension()** - Extract extension from MIME types (e.g., "text/html" → "html")

The benchmark runs multiple iterations with various inputs including common web types (html, js, json), media types (png, jpg, mp4), and edge cases (unknown extensions, paths with directories). Operations per second is calculated across all iterations to provide a stable performance metric.

Higher ops_per_sec indicates better performance. The metric is sensitive to:
- Map lookup efficiency in the core Mime class
- String parsing overhead in getType()
- Type normalization in getExtension()

Secondary validation: All tests in `npm test` must pass to ensure functionality is preserved.
