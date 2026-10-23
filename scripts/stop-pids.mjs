// Stop leftover preview servers / headless Chrome of THIS project, by PID (passed on the command line).
for (const pid of process.argv.slice(2).map(Number)) {
  try {
    process.kill(pid);
    console.log(`stopped ${pid}`);
  } catch (e) {
    console.log(`${pid}: ${e.code}`);
  }
}
