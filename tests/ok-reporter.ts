export default function okReporter(): any {
  let pass = 0;
  let fail = 0;
  let skip = 0;
  let total = 0;
  const suiteTimes = new Map<any, number>();

  return {
    onTestSuiteReady(suite: any) {
      if (suite.name) {
        console.log(`▶ ${suite.name}`);
        suiteTimes.set(suite, performance.now());
      }
    },
    onTestCaseResult(tc: any) {
      const r = tc.result();
      total++;
      const d = tc.diagnostic?.()?.duration;
      const dur = d != null ? d.toFixed(3) + "ms" : "";
      if (r.state === "passed") {
        pass++;
        console.log(`  ✔ ${tc.name} (${dur})`);
      } else if (r.state === "failed") {
        fail++;
        console.log(`  ✘ ${tc.name} (${dur})`);
        const errMsg = r.errors?.[0]?.message || "unknown error";
        console.log(`    ${errMsg}`);
      } else if (r.state === "skipped") {
        skip++;
        console.log(`  - ${tc.name} (${dur})`);
      }
    },
    onTestSuiteResult(suite: any) {
      if (!suite.name) return;
      const start = suiteTimes.get(suite);
      const dur = start != null ? (performance.now() - start).toFixed(3) + "ms" : "";
      suiteTimes.delete(suite);
      const all = [...suite.children.allTests()];
      const failed = all.filter((t: any) => t.result().state === "failed");
      const icon = failed.length === 0 ? "✔" : "✘";
      console.log(`${icon} ${suite.name} (${dur})`);
    },
    onTestRunEnd() {
      const parts = [`tests ${total}`, `${pass} passed`];
      if (fail > 0) parts.push(`${fail} failed`);
      if (skip > 0) parts.push(`${skip} skipped`);
      console.log(`\n# ${parts.join(" | ")}`);
    },
  };
}
