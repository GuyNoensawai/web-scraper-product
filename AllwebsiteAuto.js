const express = require("express");
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// URL ต่างๆ
const adviceUrls = [

  "https://www.advice.co.th/product/smart-watch",
  
  "https://www.advice.co.th/product/smart-life-and-iot",
  "https://www.advice.co.th/product/smartphone-tablet-accessories",
  "https://www.advice.co.th/product/notebooks",
  "https://www.advice.co.th/product/desktop-pc-server",
  "https://www.advice.co.th/product/notebook-accessorie",
  "https://www.advice.co.th/product/comset",
  "https://www.advice.co.th/product/computer-hardware",
  "https://www.advice.co.th/product/harddisk-storage",
  "https://www.advice.co.th/product/memory-flashdrive-reader",
  "https://www.advice.co.th/product/monitor-%E0%B8%88%E0%B8%AD%E0%B8%84%E0%B8%AD%E0%B8%A1",
  "https://www.advice.co.th/product/mouse-pads",
  "https://www.advice.co.th/product/keyboard-comboset",
  "https://www.advice.co.th/product/headset-microphone",
  "https://www.advice.co.th/product/speaker",
  "https://www.advice.co.th/product/gaming-chair-desk",
  "https://www.advice.co.th/product/other-gaming-accessoies",
  "https://www.advice.co.th/product/streamer",
  "https://www.advice.co.th/product/camera-capture",
  "https://www.advice.co.th/product/projector-presentation-tools",
  "https://www.advice.co.th/product/accessorie",
  "https://www.advice.co.th/product/ups",
  "https://www.advice.co.th/product/solar-cell",
  "https://www.advice.co.th/product/printer-scanner-fax",
  "https://www.advice.co.th/product/pos-product",
  "https://www.advice.co.th/product/ink-toner-cartridge",
  "https://www.advice.co.th/product/paper-sticker",
  "https://www.advice.co.th/product/software",
  "https://www.advice.co.th/product/cctv-and-security",
  "https://www.advice.co.th/product/network-wireless",
  "https://www.advice.co.th/product/network-wire",
  "https://www.advice.co.th/product/network-accessories",
  "https://www.advice.co.th/product/network-fiberoptic",
  "https://www.advice.co.th/product/consumer-electronics",
  "https://www.advice.co.th/productcorporate"
];

const itcityUrls = [
  "https://www.itcity.in.th/product-category/Gadget",
  "https://www.itcity.in.th/product-category/%E0%B8%84%E0%B8%AD%E0%B8%A1%E0%B8%9E%E0%B8%B4%E0%B8%A7%E0%B9%80%E0%B8%95%E0%B8%AD%E0%B8%A3%E0%B9%8C%E0%B8%95%E0%B8%B1%E0%B9%89%E0%B8%87%E0%B9%82%E0%B8%95%E0%B9%8A%E0%B8%B0%E0%B9%81%E0%B8%A5%E0%B8%B0%E0%B8%AD%E0%B8%AD%E0%B8%A5%E0%B8%AD%E0%B8%B4%E0%B8%99%E0%B8%A7%E0%B8%B1%E0%B8%99",
  "https://www.itcity.in.th/product-category/%E0%B8%88%E0%B8%AD%E0%B8%84%E0%B8%AD%E0%B8%A1%E0%B8%9E%E0%B8%B4%E0%B8%A7%E0%B9%80%E0%B8%95%E0%B8%AD%E0%B8%A3%E0%B9%8C",
  "https://www.itcity.in.th/product-category/%E0%B8%8B%E0%B8%AD%E0%B8%9F%E0%B8%95%E0%B9%8C%E0%B9%81%E0%B8%A7%E0%B8%A3%E0%B9%8C%E0%B9%81%E0%B8%A5%E0%B8%B0%E0%B9%80%E0%B8%81%E0%B8%A1%E0%B8%AA%E0%B9%8C",
  "https://www.itcity.in.th/product-category/%E0%B8%9B%E0%B8%A3%E0%B8%B4%E0%B9%89%E0%B8%99%E0%B9%80%E0%B8%95%E0%B8%AD%E0%B8%A3%E0%B9%8C-&-%E0%B8%AA%E0%B9%81%E0%B8%81%E0%B8%99%E0%B9%80%E0%B8%99%E0%B8%AD%E0%B8%A3%E0%B9%8C",
  "https://www.itcity.in.th/product-category/%E0%B8%9F%E0%B8%B4%E0%B8%A5%E0%B9%8C%E0%B8%A1",
  "https://www.itcity.in.th/product-category/%E0%B8%A5%E0%B8%B3%E0%B9%82%E0%B8%9E%E0%B8%87-&-%E0%B8%AB%E0%B8%B9%E0%B8%9F%E0%B8%B1%E0%B8%87",
  "https://www.itcity.in.th/product-category/%E0%B8%AA%E0%B8%A1%E0%B8%B2%E0%B8%A3%E0%B9%8C%E0%B8%97%E0%B9%82%E0%B8%9F%E0%B8%99%E0%B9%81%E0%B8%A5%E0%B8%B0%E0%B8%AD%E0%B8%B8%E0%B8%9B%E0%B8%81%E0%B8%A3%E0%B8%93%E0%B9%8C%E0%B9%80%E0%B8%AA%E0%B8%A3%E0%B8%B4%E0%B8%A1",
  "https://www.itcity.in.th/product-category/%E0%B8%AA%E0%B8%B4%E0%B8%99%E0%B8%84%E0%B9%89%E0%B8%B2%E0%B9%80%E0%B8%97%E0%B8%84%E0%B9%82%E0%B8%99%E0%B9%82%E0%B8%A5%E0%B8%A2%E0%B8%B5-Ai",
  "https://www.itcity.in.th/product-category/%E0%B8%AD%E0%B8%B8%E0%B8%9B%E0%B8%81%E0%B8%A3%E0%B8%93%E0%B9%8C%E0%B8%84%E0%B8%AD%E0%B8%A1%E0%B8%9E%E0%B8%B4%E0%B8%A7%E0%B9%80%E0%B8%95%E0%B8%AD%E0%B8%A3%E0%B9%8C%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%81%E0%B8%AD%E0%B8%9A-(DIY)",
  "https://www.itcity.in.th/product-category/%E0%B8%AD%E0%B8%B8%E0%B8%9B%E0%B8%81%E0%B8%A3%E0%B8%93%E0%B9%8C%E0%B8%88%E0%B8%B1%E0%B8%94%E0%B9%80%E0%B8%81%E0%B9%87%E0%B8%9A%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%A1%E0%B8%B9%E0%B8%A5",
  "https://www.itcity.in.th/product-category/%E0%B8%AD%E0%B8%B8%E0%B8%9B%E0%B8%81%E0%B8%A3%E0%B8%93%E0%B9%8C%E0%B9%80%E0%B8%81%E0%B8%A1%E0%B8%A1%E0%B8%B4%E0%B9%88%E0%B8%87",
  "https://www.itcity.in.th/product-category/%E0%B8%AD%E0%B8%B8%E0%B8%9B%E0%B8%81%E0%B8%A3%E0%B8%93%E0%B9%8C%E0%B9%80%E0%B8%99%E0%B9%87%E0%B8%95%E0%B9%80%E0%B8%A7%E0%B8%B4%E0%B8%A3%E0%B9%8C%E0%B8%81-&-%E0%B9%80%E0%B8%A3%E0%B8%B2%E0%B9%80%E0%B8%95%E0%B8%AD%E0%B8%A3%E0%B9%8C",
  "https://www.itcity.in.th/product-category/%E0%B8%AD%E0%B8%B8%E0%B8%9B%E0%B8%81%E0%B8%A3%E0%B8%93%E0%B9%8C%E0%B9%80%E0%B8%AA%E0%B8%A3%E0%B8%B4%E0%B8%A1",
  "https://www.itcity.in.th/product-category/%E0%B8%AD%E0%B8%B8%E0%B8%9B%E0%B8%81%E0%B8%A3%E0%B8%93%E0%B9%8C%E0%B9%84%E0%B8%AD%E0%B8%97%E0%B8%B5%E0%B9%80%E0%B8%9E%E0%B8%B7%E0%B9%88%E0%B8%AD%E0%B8%AA%E0%B8%B8%E0%B8%82%E0%B8%A0%E0%B8%B2%E0%B8%9E",
  "https://www.itcity.in.th/product-category/%E0%B8%AD%E0%B8%B8%E0%B8%9B%E0%B8%81%E0%B8%A3%E0%B8%93%E0%B9%8C%E0%B9%84%E0%B8%AD%E0%B9%82%E0%B8%AD%E0%B8%97%E0%B8%B5",
  "https://www.itcity.in.th/product-category/%E0%B9%80%E0%B8%84%E0%B8%A3%E0%B8%B7%E0%B9%88%E0%B8%AD%E0%B8%87%E0%B9%80%E0%B8%A5%E0%B9%88%E0%B8%99%E0%B9%80%E0%B8%81%E0%B8%A1%E0%B8%9E%E0%B8%81%E0%B8%9E%E0%B8%B2",
  "https://www.itcity.in.th/product-category/%E0%B9%80%E0%B8%84%E0%B8%A3%E0%B8%B7%E0%B9%88%E0%B8%AD%E0%B8%87%E0%B9%83%E0%B8%8A%E0%B9%89%E0%B9%84%E0%B8%9F%E0%B8%9F%E0%B9%89%E0%B8%B2%E0%B8%A0%E0%B8%B2%E0%B8%A2%E0%B9%83%E0%B8%99%E0%B8%9A%E0%B9%89%E0%B8%B2%E0%B8%99",
  "https://www.itcity.in.th/product-category/%E0%B9%80%E0%B8%8B%E0%B8%97%E0%B8%84%E0%B8%AD%E0%B8%A1%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%81%E0%B8%AD%E0%B8%9A",
  "https://www.itcity.in.th/product-category/%E0%B9%81%E0%B8%97%E0%B9%87%E0%B8%9A%E0%B9%80%E0%B8%A5%E0%B9%87%E0%B8%95%E0%B9%81%E0%B8%A5%E0%B8%B0%E0%B8%AD%E0%B8%B8%E0%B8%9B%E0%B8%81%E0%B8%A3%E0%B8%93%E0%B9%8C%E0%B9%80%E0%B8%AA%E0%B8%A3%E0%B8%B4%E0%B8%A1",
  "https://www.itcity.in.th/product-category/%E0%B9%82%E0%B8%99%E0%B9%89%E0%B8%95%E0%B8%9A%E0%B8%B8%E0%B9%8A%E0%B8%84%E0%B9%81%E0%B8%A5%E0%B8%B0%E0%B8%AD%E0%B8%B8%E0%B8%9B%E0%B8%81%E0%B8%A3%E0%B8%93%E0%B9%8C%E0%B9%80%E0%B8%AA%E0%B8%A3%E0%B8%B4%E0%B8%A1",
];
const bananaUrl = "https://www.bnn.in.th/th/p?ref=search-result";

// ตัวแปรเก็บข้อมูลล่าสุด
let adviceProducts = [];
let itcityProducts = [];
let bananaProducts = [];

// ฟังก์ชันรัน scrape ทั้งหมดและเก็บข้อมูล
async function scrapeAll() {
  console.log("🔄 เริ่ม scrape ข้อมูลใหม่");

  const browser = await puppeteer.launch({
    headless: true,
    protocolTimeout: 600000,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0");

  try {
    itcityProducts = await scrapeITCity(browser, itcityUrls, 1);
    console.log("ITCity products:", itcityProducts.length);
    
    adviceProducts = await scrapeAdvice(browser, adviceUrls, 1);
    console.log("Advice products:", adviceProducts.length);

    bananaProducts = await scrapeBanana(page, bananaUrl);
    console.log("Banana products:", bananaProducts.length);

    // เก็บไฟล์สำรอง JSON
    fs.writeFileSync(
      "products_advice.json",
      JSON.stringify(adviceProducts, null, 2),
      "utf-8"
    );
    fs.writeFileSync(
      "products_itcity.json",
      JSON.stringify(itcityProducts, null, 2),
      "utf-8"
    );
    fs.writeFileSync(
      "products_banana.json",
      JSON.stringify(bananaProducts, null, 2),
      "utf-8"
    );

    console.log("✅ Scrape สำเร็จ");
  } catch (err) {
    console.error("❌ Error scraping data:", err);
  } finally {
    await browser.close();
  }
}

// เรียก scrape ครั้งแรกตอนเริ่ม server
scrapeAll();
setInterval(scrapeAll, 7200000);

app.get("/", (req, res) => {
  console.log("Banana products sample:", bananaProducts.slice(0, 3));
  res.render("indexAuto", {
    advice: adviceProducts,
    itcity: itcityProducts,
    banana: bananaProducts,
  });
});

app.get("/data", (req, res) => {
  const all = [...adviceProducts, ...itcityProducts, ...bananaProducts];
  res.json(all);
});

app.listen(3000, () => {
  console.log("🚀 Server started: http://localhost:3000");
});

//scrapeAdvice
async function scrapeAdvice(browser, urls, batchSize = 1) {
  const allProducts = [];

  //แบ่ง URL ออกเป็นกลุ่ม (batch) ตามจำนวน batchSize
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    console.log(`🚀 Advice: Batch ${i / batchSize + 1} (${batch.length} URLs)`);
    console.log("🔢 รายการใน Batch นี้:");
    batch.forEach((url, index) => {
      console.log(`  ${index + 1}. ${url}`);
    });

    const batchResults = await Promise.all(
      batch.map(async (url) => {
        const page = await browser.newPage();
        await page.setUserAgent("Mozilla/5.0");

        console.log("🔍 เริ่มโหลดหน้า:", url);
        await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });

        const products = [];
        let hasNextPage = true;

        //วนหา pagination ถ้ามี
        while (hasNextPage) {
          //scroll ลงสุดเพื่อโหลด lazy content
          await page.evaluate(async () => {
          await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            let previousHeight = 0;
          
            const timer = setInterval(() => {
              window.scrollBy(0, distance);
              totalHeight += distance;
            
              const scrollHeight = document.body.scrollHeight;
              if (scrollHeight === previousHeight) {
                clearInterval(timer);
                resolve();
              }
              previousHeight = scrollHeight;
            }, 100);
          });
        });


          try {
            await page.waitForSelector("div.product-content", { timeout: 0 });
          } catch (err) {
            console.warn("❌ Advice error:", err.message);
            break;
          }

          //ดึงข้อมูลสินค้าในหน้าปัจจุบัน
          const items = await page.evaluate(() => {
            return Array.from(
              document.querySelectorAll("div.product-content")
            ).map((el) => {
              const priceText =
                el
                  .querySelector("div div.price-to-cart div.sale")
                  ?.innerText.match(/[\d,]+/)?.[0] || "0";
              const discountText =
                el
                  .querySelector("div div.online-save")
                  ?.innerText.match(/[\d,]+/)?.[0] || "0";
              const price = parseFloat(priceText.replace(/,/g, "")) || 0;
              const discount = parseFloat(discountText.replace(/,/g, "")) || 0;
              const sellprice = price - discount;

              return {
                source: "advice.co.th",
                name:
                  el.querySelector("div.product-name")?.innerText.trim() ||
                  "ไม่มีข้อมูล",
                price: price.toLocaleString(),
                discount: discount.toLocaleString(),
                sellprice: sellprice.toLocaleString(),
                image:
                  el
                    .querySelector("div.product-image img")
                    ?.getAttribute("src") || "",
                link: el.querySelector("a")?.href || "",
              };
            });
          });

          products.push(...items);
          console.log(`✅ ดึงจาก ${url} → ${items.length} รายการ`);

          //คลิกปุ่ม next ถ้ามี เพื่อโหลดหน้าถัดไป
          const nextBtn = await page.$("a.next:not(.disabled):not(.hide)");
          if (nextBtn) {
            await Promise.all([
              page.waitForNavigation({ waitUntil: "networkidle2" }),
              nextBtn.click(),
            ]);
          } else {
            hasNextPage = false;
          }
        }

        await page.close();
        return products;
      })
    );

    //รวมสินค้าจากทุก URL ใน batch ปัจจุบัน
    allProducts.push(...batchResults.flat());
  }

  return allProducts;
}

//scrapeITCity
async function scrapeITCity(browser, urls, batchSize = 1) {
  const allProducts = [];

  //แบ่ง URL ออกเป็นกลุ่ม batch ละ batchSize
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    console.log(`🚀 ITCity: Batch ${i / batchSize + 1} (${batch.length} URLs)`);

    const batchResults = await Promise.all(
      batch.map(async (url) => {
        const page = await browser.newPage();
        await page.setUserAgent("Mozilla/5.0");

        const products = [];

        console.log("🔍 เริ่มโหลดหน้า:", url);
        try {
          await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });
          await page.waitForSelector(".product-card", { timeout: 0 });

          //วนคลิกปุ่ม "ดูสินค้าทั้งหมด" ถ้ายังโหลดได้เพิ่ม
          let prevCount = 0;
          while (true) {
            const currentCount = await page.evaluate(
              () => document.querySelectorAll(".product-card").length
            );
            if (currentCount <= prevCount) break;
            prevCount = currentCount;

            const seeMoreBtn = await page.$(
              "button.btn-primary-outline.px-\\[94px\\]"
            );
            if (!seeMoreBtn) break;

            try {
              await page.evaluate(
                (el) =>
                  el.scrollIntoView({ behavior: "smooth", block: "center" }),
                seeMoreBtn
              );
              await Promise.all([
                page.waitForResponse(
                  (res) =>
                    res.ok() &&
                    res.url().includes("/pagerender/content/product-badge"),
                  { timeout: 0 }
                ),
                seeMoreBtn.click(),
              ]);
              await new Promise((r) => setTimeout(r, 5000)); // หน่วงโหลดข้อมูล
            } catch {
              break;
            }
          }

          //ดึงข้อมูลจาก DOM หลังโหลดครบ
          const items = await page.evaluate(() => {
            return Array.from(document.querySelectorAll(".product-card")).map(
              (el) => {
                return {
                  source: "itcity.in.th",
                  logo: "https://www.itcity.in.th/images/logo.svg",
                  name:
                    el.querySelector("a.title span")?.innerText.trim() ||
                    "ไม่มีข้อมูล",
                  category:
                    document
                      .querySelector("div.flex h1.text-heading-1")
                      ?.innerText.trim() || "ไม่มีข้อมูล",
                  brand:
                    el.querySelector("p.brand")?.innerText.trim() ||
                    "ไม่มีข้อมูล",
                  price:
                    el
                      .querySelector("div.price-wrap div.was-price")
                      ?.innerText.match(/[\d,]+/)?.[0] ||
                    el
                      .querySelector("p.price")
                      ?.innerText.match(/[\d,]+/)?.[0] ||
                    "0",
                  discount:
                    el
                      .querySelector("div.price-wrap div.save-price")
                      ?.innerText.match(/[\d,]+/)?.[0] || "0",
                  sellprice:
                    el
                      .querySelector("p.price")
                      ?.innerText.match(/[\d,]+/)?.[0] || "ไม่มีข้อมูล",
                  image: el.querySelector("img")?.getAttribute("src") || "",
                  warranty: "ไม่มีข้อมูล",
                  views: "ไม่มีข้อมูล",
                  link: el.querySelector("a")?.href || "",
                };
              }
            );
          });

          products.push(...items);
          console.log(`✅ ดึงจาก ${url} → ${items.length} รายการ`);
        } catch (err) {
          console.error(`❌ Error scraping ITCity URL: ${url}`, err);
        }

        await page.close();
        return products;
      })
    );

    //รวมข้อมูลจาก batch ปัจจุบัน
    allProducts.push(...batchResults.flat());
  }

  //กรองรายการซ้ำตามลิงก์
  const uniqueMap = new Map();
  allProducts.forEach((p) => {
    if (!uniqueMap.has(p.link)) uniqueMap.set(p.link, p);
  });

  const uniqueProducts = Array.from(uniqueMap.values());
  console.log(`✅ รวมสินค้าทั้งหมด ITCity: ${uniqueProducts.length} รายการ (หลังกรองซ้ำ)`);

  return uniqueProducts;
}


async function scrapeBanana(page, categoryUrl) {
  try {
    const products = [];
    let currentPage = 1;
    let hasMore = true;

    while (hasMore) {
      const url = new URL(categoryUrl);
      url.searchParams.set("page", currentPage);

      console.log(`📄 ดึงข้อมูล Banana หน้า ${currentPage}`);

      await page.goto(url.href, { waitUntil: "networkidle2", timeout: 0 });
      await new Promise((r) => setTimeout(r, 10000));

      try {
        await page.waitForSelector(".product-item", { timeout: 0 });
      } catch {
        console.log("❌ ไม่พบสินค้าในหน้านี้ อาจหมดหน้าแล้ว");
        hasMore = false;
        break;
      }

      const items = await page.evaluate(() => {
        return Array.from(document.querySelectorAll(".product-item")).map(
          (el) => {
            const sellpriceText =
              el
                .querySelector("div.product-item-details div.product-price")
                ?.innerText.match(/[\d,]+/)?.[0] || "0";
            const discountText =
              el
                .querySelector("span.label strong")
                ?.innerText.match(/[\d,]+/)?.[0] || "0";

            const sellprice = parseFloat(sellpriceText.replace(/,/g, "")) || 0;
            const discount = parseFloat(discountText.replace(/,/g, "")) || 0;
            const price = sellprice + discount;

            return {
              source: "banana.co.th",
              logo: "https://www.bnn.in.th/_nuxt/img/site-logo.9ca15bd.svg",
              name:
                el.querySelector(".product-name")?.innerText.trim() ||
                "ไม่มีข้อมูล",
              category:
                document
                  .querySelector("div.page-title-container h1.page-title")
                  ?.innerText.trim() || "ไม่มีข้อมูล",
              brand:
                document
                  .querySelector(
                    "div.product-item-image-container div.product-label-brand"
                  )
                  ?.innerText.trim() || "ไม่มีข้อมูล",
              price: price.toLocaleString(),
              discount: discount.toLocaleString(),
              sellprice: sellprice.toLocaleString(),
              image: el.querySelector("img.image")?.getAttribute("src") || "",
              warranty: "ไม่มีข้อมูล",
              views: "ไม่มีข้อมูล",
              link: el.querySelector("a")?.href || "",
            };
          }
        );
      });

      console.log(
        `✅ ดึงข้อมูล Banana หน้า ${currentPage} ได้ ${items.length} รายการ`
      );

      if (items.length === 0) {
        hasMore = false;
      } else {
        products.push(...items);
        currentPage++;
      }
    }

    console.log(`✅ รวมสินค้าทั้งหมด Banana: ${products.length} รายการ`);

    return products;
  } catch (error) {
    console.log(error);
  }
}
