/** Node developer-tool entry only. Never imported by the browser material runtime. */
import { runGlassLintCLI } from './cli-main.js';
declare const __GLASS_CLI_VERSION__:string;
process.stdout.on('error',(error:NodeJS.ErrnoException)=>{if(error.code==='EPIPE')process.exitCode=0;else process.exitCode=2;});
const result=await runGlassLintCLI(process.argv.slice(2),process.stdin,process.cwd(),__GLASS_CLI_VERSION__);
if(result.stdout)process.stdout.write(result.stdout);
if(result.stderr)process.stderr.write(result.stderr);
process.exitCode=result.exitCode;
