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

let bananaProducts = [];

const bananaUrl = "https://www.bnn.in.th/en/p/notebook/2-in-1-notebook?category_path=Notebook%3E2-in-1%20Notebook&in_stock=false&sort_by=relevance&page=1";

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
    const page = await browser.newPage();
    bananaProducts = await scrapeBanana(browser, page, bananaUrl);
    fs.writeFileSync("products_banana.json", JSON.stringify(bananaProducts, null, 2), "utf-8");
    console.log("✅ Scrape สำเร็จ", bananaProducts.length, "รายการ");
  } catch (err) {
    console.error("❌ Error scraping data:", err);
  } finally {
    await browser.close();
  }
}

setInterval(scrapeAll, 2 * 60 * 60 * 1000); // ทุก 2 ชั่วโมง
scrapeAll(); // เรียกตอนเริ่ม

app.get("/", (req, res) => {
  console.log("Banana products sample:", bananaProducts.slice(0, 3));
  res.render("indexAuto", {
    banana: bananaProducts,  // ต้องตรงกับตัวแปรใน EJS ด้วย
  });
});

app.get("/data2", (req, res) => {
  res.json(bananaProducts);
});

app.listen(3000, () => console.log("🚀 Server started at http://localhost:3000"));

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

module.exports = scrapeBanana;