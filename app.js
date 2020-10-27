const express = require("express");
const { CanvasRenderService } = require("chartjs-node-canvas");
let app = express();
const { PDFDocument, StandardFonts, rgb, PageSizes } = require("pdf-lib");

const configuration = {
  type: "bar",
  data: {
    labels: ["Africa", "Asia", "Europe", "Latin America", "North America"],
    datasets: [
      {
        label: "Scored",
        data: [2478, 5267, 734, 784, 433],
        backgroundColor: [
          "rgba(255, 99, 132, 0.2)",
          "rgba(54, 162, 235, 0.2)",
          "rgba(255, 206, 86, 0.2)",
          "rgba(75, 192, 192, 0.2)",
          "rgba(153, 102, 255, 0.2)",
          "rgba(255, 159, 64, 0.2)",
        ],
        borderColor: [
          "rgba(255,99,132,1)",
          "rgba(54, 162, 235, 1)",
          "rgba(255, 206, 86, 1)",
          "rgba(75, 192, 192, 1)",
          "rgba(153, 102, 255, 1)",
          "rgba(255, 159, 64, 1)",
        ],
        borderWidth: 1,
      },
    ],
  },
  options: {
    // set devicePixelRatio to render sharp imge
    // more detail can be found: https://www.chartjs.org/docs/latest/general/device-pixel-ratio.html
    devicePixelRatio: 2,
    scales: {
      yAxes: [
        {
          ticks: {
            precision: 0,
            beginAtZero: true,
          },
        },
      ],
    },
  },
};

const makeChart = async () => {
  const canvasRenderService = new CanvasRenderService(800, 600);
  return await canvasRenderService.renderToBuffer(configuration);
};

app.get("/", async (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Document</title>
    </head>
    <body>
      <div>
        <a href="/chart"> Get Image</a>
      </div>
      <div>
        <a href="/pdf"> Get Pdf</a>
      </div>
    </body>
    </html>`);
});



app.get("/chart", async function (req, res) {
  var image = await makeChart();
  res.type("image/png");
  res.send(image);
});

const makePdf = async ()=> {
  // Create a new PDFDocument
  const pdfDoc = await PDFDocument.create();

  // Embed the Times Roman font
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  // Add a blank page to the document
  const page = pdfDoc.addPage(PageSizes.A4);

  // Get the width and height of the page
  const { width, height } = page.getSize();

  // Draw a string of text toward the top of the page
  const fontSize = 24;
  page.drawText("Chart:", {
    x: 50,
    y: height - 4 * fontSize,
    size: fontSize,
    font: timesRomanFont,
    color: rgb(0, 0.53, 0.71),
  });

  const pngImageBytes = await makeChart();
  const pngImage = await pdfDoc.embedPng(pngImageBytes);
  const pngDims = pngImage.scale(0.25);
  page.drawImage(pngImage, {
    x: page.getWidth() / 2 - pngDims.width / 2,
    y: page.getHeight()  - (pngDims.height + 150),
    width: pngDims.width,
    height: pngDims.height,
  });

  // Serialize the PDFDocument to bytes (a Uint8Array)
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes.buffer, "binary");
} 

app.get("/pdf", async (req, res) => {
  const buff = await makePdf();
  res.status(200).type("pdf").send(buff);
});

app.listen(4000, () => {
  console.log("Serve is listenning on 4000!");
});
