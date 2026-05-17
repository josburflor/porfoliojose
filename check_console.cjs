const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Listen for console logs
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'error' || type === 'warning' || type === 'log') {
      console.log(`[BROWSER ${type.toUpperCase()}] ${msg.text()}`);
    }
  });

  // Listen for uncaught exceptions
  page.on('pageerror', error => {
    console.error(`[BROWSER PAGE EXCEPTION] ${error.message}`);
  });

  // Listen for failed requests
  page.on('requestfailed', request => {
    console.error(`[BROWSER REQUEST FAILED] ${request.url()} - ${request.failure().errorText}`);
  });

  await page.goto('http://localhost:3003', { waitUntil: 'networkidle0' });
  
  await browser.close();
})();
