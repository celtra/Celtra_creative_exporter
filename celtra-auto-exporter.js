const puppeteer = require("puppeteer");
var fs = require('fs');
var path = require('path');
var winston = require('winston');

const logLevels = {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    trace: 5,
};

const logFormat = winston.format.printf(info => {
    const formattedDate = info.timestamp.replace('T', ' ').replace('Z', '');
    return `${formattedDate} | CELTRA-AUTO-EXPORTER | ${info.level} | ${
     info.message
    }`;
   });

const logger = winston.createLogger({
    levels: logLevels,
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        logFormat
       ),
    transports: [new winston.transports.File({ filename: "logs.log" }), new winston.transports.Console({colorize: true})],
    exceptionHandlers: [new winston.transports.File({ filename: "exceptions.log" })],
    rejectionHandlers: [new winston.transports.File({ filename: "rejections.log" })],
});

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkDir(dirName, iteration) {
    await timeout(3000);
    let sec = 1;
    return new Promise(resolve => {
        var interval = setInterval(() => {
            if (sec >= 120) {
                logger.error("Directory check timeout");
                clearInterval(interval);
                reslove(false);
            }
            fs.readdir(dirName, function(err, files) {
                if (err) {
                    logger.error(err);
                    resolve(false);
                } else {
                    if (files.length > 0 ) {
                        if (files.some(f => path.extname(f) !== '.crdownload') && files.some(f => f === 'exportedCreatives.zip')) {
                            fs.rename(`${dirName}/exportedCreatives.zip`, `${dirName}/exportedCreatives${iteration}.zip`, function(err) {
                                if ( err ) {
                                    logger.error(`Error renaming download files: ${err}`);
                                } else {
                                    logger.info(`Downloaded exportedCreatives${iteration}.zip!`);
                                }     
                            });
                            clearInterval(interval);
                            resolve(true);
                        } else {
                            logger.info("Download in progress ...");
                        }
                    }
                }
            });
            sec += 1;            
        }, 1000);
    }); 
}

(async () => {
    /** 
     * TO DO: 
     *      - POWER BI REPORT DOWNLOAD
     *      - REPORT SCRAPING
     */
    console.clear();
    // hardcoded creatives for now
    const creatives = [
        "0a0c3817",
        "0ec27478",
        "c863c7cc",
        "d5bc3adb",
        "d9d4305f",
        "ddc1c83f",
        "fa45a139",
        "fae33266",
        "1f291a62",
        "37a51142",
        "69440476",
        "8150c04d",
        "9868b623",
        "a0730bb2",
        "a39348c9",
        "aa712a32",
        "0af3e3f1",
        "282cee4b",
        "2974d117",
        "5d1ce06a",
        "69f3d8af",
        "6d53d7c9",
        "6fdf2d7d",
        "7d6cd7a0",
        "8bd4e8f7",
        "a248f3fe",
        "a3383ea5",
        "ca47f073",
        "cceea947",
        "ed69dd50",
        "f29ee7bf",
        "f8dc278a",
        "0d279d5e",
        "0f9f3bc0",
        "950a9892",
        "a02b02d3",
        "a575cc44",
        "c1cb4f30",
        "ca7e597d",
        "de078173",
        "1e433c6c",
        "29ad9ec7",
        "5118b924",
        "6c849148",
        "70466903",
        "7249af90",
        "92889795",
        "9439bfb9",
        "19dbd026",
        "27f9f832",
        "9e911f7b",
        "bdeee83d",
        "dccef14d",
        "e47f3129",
        "e93a26a5",
        "ef9c7791",
        "01182159",
        "12eac328",
        "164253f0",
        "388fd88a",
        "3626e373",
        "3e674b6c",
        "49299cc8",
        "5368c56c",
        "738943c0",
        "a40131d2",
        "a69cd316",
        "b20c1e2a",
        "b21764b3",
        "ca1328da",
        "eda8202e",
        "3cfdcef9",
        "ee271fe3",
        "efbed5a4",
        "6bfbe175",
        "75b249ab",
        "80453ee0",
        "8117168d",
        "8ff4fe95",
        "9809c0fe",
        "06de1323",
        "0c9d45fb",
        "b5bea315",
        "c0ffee91",
        "c98aa9de",
        "de3fb301",
        "e423560b",
        "ffc281fa",
        "1028ed80",
        "12f8dd6d",
        "3da2e67a",
        "42c57055",
        "4386a2d1",
        "5573cbbf",
        "a46c5d9c",
        "a524fec1",
        "1d198855",
        "207a1190",
        "a1fa6737",
        "c7c477cf",
        "dee0be6b",
        "ebd8789c",
        "f0c358f4",
        "fc6a587d",
        "38ce1091",
        "3e7841b6",
        "40c1c33d",
        "50512b61",
        "78c72241",
        "8ce0980d",
        "968e3315",
        "97ea00b8"
    ];
    logger.info("Starting ...");
    logger.info(`Got ${creatives.length} creatives`);
    const browser = await puppeteer.launch({headless: true});
    logger.info("Launched browser");
    const page = await browser.newPage();
    logger.info("Created new tab");
    const now = new Date().toISOString();
    const dirName = `./${now}`;
    await fs.mkdir(dirName, (err) => {
        err ? logger.error(`Error creating directory: ${err}`) : logger.info(`Created directory: ${dirName}`);
    });
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: dirName });
    logger.info(`Changed download path to: ${dirName}`);

    const url = `https://${process.argv[2]}.celtra.io/creative-export?ids=${creatives[0]}`;
    await page.goto(url);
    await page.waitForNavigation({waitUntil: 'networkidle2'});
    logger.info(`Navigated to: ${url}`);

    await page.type('#email > div > div.input-row.input-row--light > div > input', process.argv[3]);
    await page.click("#login > div.container-card > div > div.inputs-container > div.login-button-container > div > div > div");
    logger.info(`Entered email and clicked next`);
    await page.waitForSelector('#password > div > div.input-row.input-row--light > div.input-row__input-flex > input');
    await page.type('#password > div > div.input-row.input-row--light > div.input-row__input-flex > input', process.argv[4]);
    await page.click("#login > div.container-card > div > div.inputs-container > div.login-button-container > div > div > div");
    logger.info(`Entered password and clicked login`);

    await page.waitForNavigation({waitUntil: 'networkidle2'});

    let batchStatus = { successes: 0, errors: 0, total: Math.ceil(creatives.length/10) }; 

    for (let i = 0; i < creatives.length; i += 10) {
        const chunk = creatives.slice(i, i + 10);
        const url = `https://${process.argv[2]}.celtra.io/creative-export?ids=${chunk.toString()}`;
        await page.goto(url);
        logger.info(`Navigated to: ${url}`);
        await page.waitForSelector('#creative-export-container > div > div > div.content-wrapper > div.filters > div:nth-child(1) > div > div:nth-child(2) > div > span');
        await page.click("#creative-export-container > div > div > div.content-wrapper > div.filters > div:nth-child(1) > div > div:nth-child(2) > div > span");
        await page.waitForSelector("div[title='Generic']");
        await page.click("div[title='Generic']");
        logger.info(`Chose ad server`);
        // Execute download and check directory for downloaded zip
        await page.click("#creative-export-container > div > div > div.content-wrapper > div.filters > div.filters__section.filters__section--right > button");
        logger.info(`Executed download`);
        await page.waitForSelector("#creative-export-container > div > div > div.content-wrapper > div.filters > div.filters__section.filters__section--right > div > div > span");
        await page.waitForFunction(() => {
            if (!document.querySelector("#creative-export-container > div > div > div.content-wrapper > div.filters > div.filters__section.filters__section--right > div > div > span")) {
                return true;
            }
        });
        logger.info(`exportedCreatives${i}.zip Download started ...`);
        const isPrompt = await page.evaluate(async () => { 
            return await new Promise(resolve => {
                if (document.querySelector("#creative-export-container > div > div > div.prompt__overlay.creative-export__prompt.creative-export__prompt--visible")) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        });
        if (isPrompt) {
            await page.screenshot({
                path: `./error_screenshots/${now}-batch${i}.jpg`
            });
            logger.error(`Downloading of batch ${i} - ${i+10} failed! see screenshot at ./error_screenshots/${now}-batch${i}.jpg`);
            batchStatus.errors += 1;
        } else {
            const status = await checkDir(dirName, i);
            logger.info(`Downloading batch ${i} - ${i+10} finished!`);
            if (status) {
                batchStatus.successes += 1;
            } else {
                batchStatus.errors += 1;
            }
        }
    }
    // choose "generic" for ad server 
    await browser.close();
    logger.info(`Closed the browser, job finished!`);
    logger.info(`Batch status: ${batchStatus.successes} sucesses, ${batchStatus.errors} errors (${parseFloat((batchStatus.successes/batchStatus.total)*100).toFixed(2)}% sucess rate)`);
  })();