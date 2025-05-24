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

let ItcityProducts = [];

const itcityUrls = [
  "https://www.itcity.in.th/product-category/Gadget",

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
    ItcityProducts = await scrapeITCity(browser, itcityUrls, 1);
    fs.writeFileSync("products_itcity.json", JSON.stringify(ItcityProducts, null, 2), "utf-8");
    console.log("✅ Scrape สำเร็จ", ItcityProducts.length, "รายการ");
  } catch (err) {
    console.error("❌ Error scraping data:", err);
  } finally {
    await browser.close();
  }
}

setInterval(scrapeAll, 2 * 60 * 60 * 1000); // ทุก 2 ชั่วโมง
scrapeAll(); // เรียกตอนเริ่ม

app.get("/", (req, res) => {
  console.log("Render หน้า / with products:", ItcityProducts.length);  // เพิ่ม log ดูจำนวนสินค้า
  res.render("indexAuto", {
    itcity: ItcityProducts,  // ต้องตรงกับตัวแปรใน EJS ด้วย
  });
});

app.get("/data3", (req, res) => {
  res.json(ItcityProducts);
});

app.listen(3000, () => console.log("🚀 Server started at http://localhost:3000"));

async function scrapeITCity(browser, urls, batchSize = 1) {
  const allProducts = [];

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (url) => {
        const page = await browser.newPage();
        await page.setUserAgent("Mozilla/5.0");

        const products = [];

        try {
          await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });
          await page.waitForSelector(".product-card", { timeout: 0 });

          let prevCount = 0;
          while (true) {
            const currentCount = await page.evaluate(
              () => document.querySelectorAll(".product-card").length
            );
            if (currentCount <= prevCount) break;
            prevCount = currentCount;

            const seeMoreBtn = await page.$("button.btn-primary-outline.px-\\[94px\\]");
            if (!seeMoreBtn) break;

            try {
              await page.evaluate(
                (el) => el.scrollIntoView({ behavior: "smooth", block: "center" }),
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
              await new Promise((r) => setTimeout(r, 5000));
            } catch {
              break;
            }
          }

          const items = await page.evaluate(() => {
            return Array.from(document.querySelectorAll(".product-card")).map((el) => {
              return {
                source: "itcity.in.th",
                logo: "https://www.itcity.in.th/images/logo.svg",
                name: el.querySelector("a.title span")?.innerText.trim() || "ไม่มีข้อมูล",
                category: document.querySelector("div.flex h1.text-heading-1")?.innerText.trim() || "ไม่มีข้อมูล",
                brand: el.querySelector("p.brand")?.innerText.trim() || "ไม่มีข้อมูล",
                price: el.querySelector("div.price-wrap div.was-price")?.innerText.match(/[\d,]+/)?.[0]
                    || el.querySelector("p.price")?.innerText.match(/[\d,]+/)?.[0]
                    || "0",
                discount: el.querySelector("div.price-wrap div.save-price")?.innerText.match(/[\d,]+/)?.[0] || "0",
                sellprice: el.querySelector("p.price")?.innerText.match(/[\d,]+/)?.[0] || "ไม่มีข้อมูล",
                image: el.querySelector("img")?.getAttribute("src") || "",
                warranty: "ไม่มีข้อมูล",
                views: "ไม่มีข้อมูล",
                link: el.querySelector("a")?.href || "",
              };
            });
          });

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
              await detailPage.waitForSelector('span.product-model[data-v-cc709dfa]', { timeout: 5000 }).catch(() => {});
              await new Promise((r) => setTimeout(r, 6000));
              productCodeRaw = await detailPage.evaluate(() => {
                  const el1 = document.querySelector('span.product-model[data-v-cc709dfa]');
                  if (el1 && el1.innerText) return el1.innerText.trim();
                        
                  const el2 = document.querySelector('span.product-model');
                  if (el2 && el2.innerText) return el2.innerText.trim();
                        
                  const allElements = Array.from(document.querySelectorAll('span, div, p'));
                  for (const el of allElements) {
                    if (el.innerText && el.innerText.includes('SKU')) return el.innerText.trim();
                  }
                
                  return null;
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

          products.push(...items);
        } catch (err) {
          console.error(`❌ Error scraping ITCity URL: ${url}`, err);
        }

        await page.close();
        return products;
      })
    );

    allProducts.push(...batchResults.flat());
  }

  const uniqueMap = new Map();
  allProducts.forEach((p) => {
    if (!uniqueMap.has(p.link)) uniqueMap.set(p.link, p);
  });

  const uniqueProducts = Array.from(uniqueMap.values());
  console.log(`✅ รวมสินค้าทั้งหมด ITCity: ${uniqueProducts.length} รายการ (หลังกรองซ้ำ)`);

  return uniqueProducts;
}

module.exports = scrapeITCity;