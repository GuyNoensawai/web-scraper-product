const express = require("express");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const path = require("path");
const fs = require("fs");

puppeteer.use(StealthPlugin());

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));

let adviceProducts = [];

const adviceUrls = [
  "https://www.advice.co.th/product/smart-watch",
];

async function scrapeAll() {
  console.log("🔄 เริ่ม scrape ข้อมูลใหม่");

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--lang=th-TH"
    ]
  });

  try {
    adviceProducts = await scrapeAdvice(browser, adviceUrls);
    fs.writeFileSync("products_advice.json", JSON.stringify(adviceProducts, null, 2), "utf-8");
    console.log("✅ Scrape สำเร็จ", adviceProducts.length, "รายการ");
  } catch (err) {
    console.error("❌ Error scraping data:", err);
  } finally {
    await browser.close();
  }
}

setInterval(scrapeAll, 2 * 60 * 60 * 1000); // ทุก 2 ชั่วโมง
scrapeAll(); // เรียกตอนเริ่ม

app.get("/", (req, res) => {
  console.log("Render หน้า / with products:", adviceProducts.length);  // เพิ่ม log ดูจำนวนสินค้า
  res.render("indexAuto", {
    advice: adviceProducts,  // ต้องตรงกับตัวแปรใน EJS ด้วย
  });
});

app.get("/data", (req, res) => {
  res.json(adviceProducts);
});

app.listen(3000, () => console.log("🚀 Server started at http://localhost:3000"));

async function scrapeAdvice(browser, urls ) {
  const allProducts = [];

  for (const url of urls) {
    const page = await browser.newPage();

    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
    await page.setViewport({ width: 1366, height: 768 });
    await page.setExtraHTTPHeaders({ "Accept-Language": "th-TH,th;q=0.9" });

    console.log("🔍 เข้าหน้า:", url);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });

    let hasNext = true;

    while (hasNext) {
      await page.evaluate(async () => {
        await new Promise(resolve => {
          let total = 0;
          const distance = 100;
          const timer = setInterval(() => {
            window.scrollBy(0, distance);
            total += distance;
            if (total >= document.body.scrollHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 100);
        });
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      const items = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("div.product-content")).map(el => {
          const priceText = el.querySelector("div.price-to-cart div.sale")?.innerText.match(/[\d,]+/)?.[0] || "0";
          const discountText = el.querySelector("div.online-save")?.innerText.match(/[\d,]+/)?.[0] || "0";
          const price = parseFloat(priceText.replace(/,/g, "")) || 0;
          const discount = parseFloat(discountText.replace(/,/g, "")) || 0;
          const sellprice = price - discount;

          return {
            name: el.querySelector("div.product-name")?.innerText.trim() || "ไม่มีข้อมูล",
            category: document.querySelector('a.cate-select')?.innerText.trim() || 'ไม่มีข้อมูล',
            brand: el.querySelector('div.brand-logo img')?.src || 'ไม่มีข้อมูล',
            price: price.toLocaleString(),
            discount: discount.toLocaleString(),
            sellprice: sellprice.toLocaleString(),
            image: el.querySelector("div.product-image img")?.src || "",
            link: el.querySelector("a")?.href || "",
            source: "advice.co.th",
            logo: "https://img.advice.co.th/images_nas/advice/oneweb/assets/images/logo.png"
          };
        });
      });

      console.log(`✅ พบ ${items.length} รายการ`);

      for (const item of items) {
        try {
          if (!item.link) {
            console.warn("❌ ไม่มีลิงก์สินค้า:", item.name);
            item.product_code = "ไม่มีข้อมูล";
            continue;
          }
        
        
          console.log("🔍 โหลดหน้า detail:", item.link);
          const detailPage = await browser.newPage();
          await detailPage.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
          await detailPage.setExtraHTTPHeaders({
            "accept-language": "th-TH,th;q=0.9",
          });
        
          const response = await detailPage.goto(item.link, {
            waitUntil: "domcontentloaded",
            timeout: 30000,  // เพิ่ม timeout เป็น 30 วิ
          });
        
          if (!response || !response.ok()) {
            console.warn("❌ โหลดหน้า detail ไม่สำเร็จ:", item.link, "Status:", response?.status());
            item.product_code = "ไม่มีข้อมูล";
            await detailPage.close();
            continue;
          }

          // เพิ่ม retry หากหา selector ไม่เจอ
          let productCodeRaw = null;
          for (let tryCount = 0; tryCount < 3; tryCount++) {
            try {
              await detailPage.waitForSelector("div.detail-block h4.product-code", { timeout: 0 });
              productCodeRaw = await detailPage.evaluate(() => {
                const el = document.querySelector("div.detail-block h4.product-code");
                return el ? el.innerText : null;
              });
              if (productCodeRaw) break;
            } catch (e) {
              console.log(`⚠️ ลองโหลดรหัสสินค้าอีกครั้ง (${tryCount + 1}/3)`, item.link);
            }
          }
        
          if (!productCodeRaw) {
            console.warn("⚠️ ไม่พบรหัสสินค้าในหน้า detail:", item.link);
            item.product_code = "ไม่มีข้อมูล";
          } else {
            console.log("🔎 พบรหัสสินค้า:", productCodeRaw);
            item.product_code = productCodeRaw.replace("รหัสสินค้า -", "").trim();
          }
        
          await detailPage.close();
        } catch (err) {
          console.warn("⚠️ โหลดรหัสสินค้าไม่สำเร็จ:", item.link, err.message);
          item.product_code = "ไม่มีข้อมูล";
        }
      }


      allProducts.push(...items);

      const nextBtn = await page.$("a.next:not(.disabled):not(.hide)");
      if (nextBtn) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: "networkidle2" }),
          nextBtn.click()
        ]);
      } else {
        hasNext = false;
      }
    }

    await page.close();
  }

  return allProducts;
}

module.exports = scrapeAdvice;