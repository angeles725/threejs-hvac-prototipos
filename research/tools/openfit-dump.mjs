// Dump window.__qaOpenFit() from a built viewer, for tools/cad-overlay.py.
import puppeteer from 'puppeteer-core';
const CHROME='/home/cristian/.cache/puppeteer/chrome/linux-150.0.7871.46/chrome-linux64/chrome';
const b=await puppeteer.launch({executablePath:CHROME,headless:'new',
 args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-gl=angle','--disable-dev-shm-usage']});
const p=await b.newPage();
await p.goto(process.argv[2],{waitUntil:'load',timeout:180000});
await p.waitForFunction('typeof window.__qaOpenFit === "function"',{timeout:180000});
console.log(JSON.stringify(await p.evaluate(()=>window.__qaOpenFit())));
await b.close();
