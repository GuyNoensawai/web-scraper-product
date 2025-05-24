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
let bananaProducts = [];
let itcityProducts = [];

const adviceUrls = [

  "https://www.advice.co.th/product/smart-watch",
  "https://www.advice.co.th/product/smart-life-and-iot",
  
];

const itcityUrls = [
  "https://www.itcity.in.th/product-category/Gadget",
  "https://www.itcity.in.th/product-category/%E0%B8%84%E0%B8%AD%E0%B8%A1%E0%B8%9E%E0%B8%B4%E0%B8%A7%E0%B9%80%E0%B8%95%E0%B8%AD%E0%B8%A3%E0%B9%8C%E0%B8%95%E0%B8%B1%E0%B9%89%E0%B8%87%E0%B9%82%E0%B8%95%E0%B9%8A%E0%B8%B0%E0%B9%81%E0%B8%A5%E0%B8%B0%E0%B8%AD%E0%B8%AD%E0%B8%A5%E0%B8%AD%E0%B8%B4%E0%B8%99%E0%B8%A7%E0%B8%B1%E0%B8%99",
];
const bananaUrl = [
  "https://www.bnn.in.th/en/p/notebook/2-in-1-notebook?category_path=Notebook%3E2-in-1%20Notebook&in_stock=false&sort_by=relevance&page=1",
  "https://www.bnn.in.th/en/p/desktop-and-all-in-one/all-in-one?category_path=Desktop%20%26%20All%20in%20one%3EAll-In-One%20%28AIO%29&in_stock=false&sort_by=relevance&page=1"
];

// ✅ ฟังก์ชันรวม
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
    [adviceProducts, bananaProducts, itcityProducts] = await Promise.all([
      scrapeAdvice(browser, adviceUrls),
      
      (async () => {
        const bananaResults = [];
        for (const url of bananaUrl) {
          const page = await browser.newPage();
          const result = await scrapeBanana(browser, page, url);
          bananaResults.push(...result);
          await page.close();
        }
        return bananaResults;
      })(),

      scrapeITCity(browser, itcityUrls),
    ]);

    fs.writeFileSync("products_advice.json", JSON.stringify(adviceProducts, null, 2), "utf-8");
    fs.writeFileSync("products_banana.json", JSON.stringify(bananaProducts, null, 2), "utf-8");
    fs.writeFileSync("products_itcity.json", JSON.stringify(itcityProducts, null, 2), "utf-8");

    console.log("✅ Scrape เสร็จแล้ว:", {
      advice: adviceProducts.length,
      banana: bananaProducts.length,
      itcity: itcityProducts.length
    });

  } catch (err) {
    console.error("❌ Error scraping data:", err);
  } finally {
    await browser.close();
  }
}

setInterval(scrapeAll, 24 * 60 * 60 * 1000); // ทุก 24 ชั่วโมง
scrapeAll(); // เรียกตอนเริ่ม

// ✅ เส้นทาง Express
app.get("/", (req, res) => {
  res.render("indexAuto", {
    advice: adviceProducts,
    banana: bananaProducts,
    itcity: itcityProducts
  });
});

app.get("/data", (req, res) => {
  res.json({
    advice: adviceProducts,
    banana: bananaProducts,
    itcity: itcityProducts
  });
});

app.listen(3000, () => console.log("🚀 Server started at http://localhost:3000"));

// ✅ นำฟังก์ชัน scrapeAdvice และ scrapeBanana มาจากที่คุณมีไว้ด้านบน และวางต่อท้าย
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
          for (let tryCount = 0; tryCount < 1; tryCount++) {
            try {
              await detailPage.waitForSelector("div.detail-block h4.product-code", { timeout: 0 });
              productCodeRaw = await detailPage.evaluate(() => {
                const el = document.querySelector("div.detail-block h4.product-code");
                return el ? el.innerText : null;
              });
              if (productCodeRaw) break;
            } catch (e) {
              console.log(`⚠️ ลองโหลดรหัสสินค้าอีกครั้ง (${tryCount + 1}/1)`, item.link);
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

async function scrapeBanana(browser, page, categoryUrl) {
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
        await page.waitForSelector(".product-item", { timeout: 5000 });
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
            const link = el.getAttribute('href') ? `https://www.bnn.in.th${el.getAttribute('href')}` : '';

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
              link
            };
          }
        );
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
            timeout: 30000,
          });

          if (!response || !response.ok()) {
            console.warn("❌ โหลดหน้า detail ไม่สำเร็จ:", item.link, "Status:", response?.status());
            item.product_code = "ไม่มีข้อมูล";
            await detailPage.close();
            continue;
          }

          let productCodeRaw = null;
          for (let tryCount = 0; tryCount < 3; tryCount++) {
            try {
              await detailPage.waitForSelector('div.sku-number span.sku-number-value[data-v-36917099]', { timeout: 0 }).catch(() => {});
              await new Promise((r) => setTimeout(r, 6000));
              productCodeRaw = await detailPage.evaluate(() => {
                const el1 = document.querySelector('span.sku-number-value[data-v-36917099]');
                if (el1 && el1.innerText) return el1.innerText.trim();

                const el2 = document.querySelector('span.sku-number-value');
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
      currentPage++;
    }

    console.log(`✅ รวมสินค้าทั้งหมด Banana: ${products.length} รายการ`);
    return products;
  } catch (error) {
    console.log(error);
  }
}

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
          for (let tryCount = 0; tryCount < 1; tryCount++) {
            try {
              await detailPage.waitForSelector('span.product-model[data-v-cc709dfa]', { timeout: 0 }).catch(() => {});
              await new Promise((r) => setTimeout(r, 1500));
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
              console.log(`⚠️ ลองโหลดรหัสสินค้าอีกครั้ง (${tryCount + 1}/1)`, item.link);
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

module.exports = {
  scrapeAdvice,
  scrapeBanana,
  scrapeITCity
};