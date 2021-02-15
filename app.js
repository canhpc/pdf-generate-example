const path = require('path')

const express = require("express");
const app = express();
const PORT = process.env.PORT || 4000;

//use to create image and pdf
const { CanvasRenderService } = require("chartjs-node-canvas");
const { PDFDocument, StandardFonts, rgb, PageSizes } = require("pdf-lib");

app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");


//use eje to render html then convert it to pdf
const ejs = require('ejs')
var pdf = require("html-pdf");

const chartConfig = {
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

const makeChartImage = async () => {
  const canvasRenderService = new CanvasRenderService(800, 600);
  return await canvasRenderService.renderToBuffer(chartConfig);
};

app.get("/", async (req, res) => {
  res.render('home');
});


app.get("/chart", async function (req, res) {
  var image = await makeChartImage();
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

  const pngImageBytes = await makeChartImage();
  const pngImage = await pdfDoc.embedPng(pngImageBytes);
  //Because we use custome Device Pixel Ratio to create chart
  // so we need to calculate the size of the image after being resized.
  const pngDims = pngImage.scale(0.25);
  page.drawImage(pngImage, {
    x: page.getWidth() / 2 - pngDims.width / 2,
    y: page.getHeight() - (pngDims.height + 150),
    width: pngDims.width,
    height: pngDims.height,
  });

  // Serialize the PDFDocument to bytes (a Uint8Array)
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes.buffer, "binary");
} 

app.get("/pdf1", async (req, res) => {
  const buff = await makePdf();
  res.status(200).type("pdf").send(buff);
});


const PORTRAIT_PRESET = {
  format: "A4",
  orientation: "portrait",
  renderDelay : 100,
  header: {
    height: "0mm",
  },
  footer: {
    height: "0mm",
  },
  quality: "100",
};


const chartConfig2 = {
  type: "bar",
  data: {
    labels: ["2020-07", "2020-08", "2020-09"],
    datasets: [
      {
        data: [2478789, 5267342, 734136],
        backgroundColor: ["#455072", "#FF4868", "#455072"],
      },
    ],
  },
  options: {
    devicePixelRatio: 4,
    animation: {
      duration: 0, // general animation time
    },
    hover: {
      animationDuration: 0, // duration of animations when hovering an item
    },
    scales: {
      yAxes: [
        {
          ticks: {
            fontColor: "#ffffff",
            //precision: 0,
            beginAtZero: false,
          },
          gridLines: {
            color: "#ffffff",
            zeroLineColor: "#ffffff",
          },
        },
      ],
      xAxes: [
        {
          gridLines: {
            display: false,
          },
          ticks: {
            fontColor: "#ffffff",
          },
        },
      ],
    },
    responsive: false,
    legend: {
      display: false,
    },
    plugins: {
      datalabels: {
        color: "#ffffff",
        anchor: "end",
        align: "start",
      },
    },
  },
};

app.get("/html2pdf", async (req, res) => {
  try {
    // const arr = Array.from(Array(30).keys());
    // const labels = arr.map((x) => `${x}`);
    // const values = arr.map((y) => Math.random() * 40 + 15);

    const template = path.join(__dirname, "/views/", "template.ejs");
    const html = await ejs.renderFile(template, {
      config: chartConfig2
    });

    pdf.create(html, PORTRAIT_PRESET).toBuffer(async (err, buff) => {
      if (err) {
        console.log(err);
        res.status(500).send(err);
      } else {
        res.contentType("application/pdf");
        res.send(buff);
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).send();
  }
});

app.get("/download-pdf", async (req, res) => {
  try {
    const template = path.join(__dirname, "/views/", "template.ejs");
    const html = await ejs.renderFile(template, {
      config: chartConfig2,
    });

    pdf.create(html, PORTRAIT_PRESET).toBuffer(async (err, buff) => {
      if (err) {
        console.log(err);
        res.status(500).send(err);
      } else {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=yourfile.pdf");
        res.setHeader("Content-Length", buff.length);
        res.send(buff);
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).send();
  }
});



const landscapePreset = {
  format: "A2",
  orientation: "landscape",
  header: {
    height: "0mm",
  },
  footer: {
    height: "0mm",
  },
  quality: "100",
  renderDelay: 100,
};

const doughtnutChart = {
  type: "doughnut",
  data: {
    datasets: [
      {
        data: [20, 20, 30],
        backgroundColor: [
          "rgba(255, 99, 132, 1)",
          "rgba(54, 162, 235, 1)",
          "rgba(255, 206, 86, 1)",
        ],
      },
    ],
  },
  options: {
    devicePixelRatio: 4,
    animation: {
      duration: 0,
    },
    hover: {
      animationDuration: 0,
    },
    responsive: false,
    legend: {
      display: false,
    },
    plugins : {},
  },
};


const billDefaulData = {
  companyInfo: {
    name: "Cloocus",
    regNum: "261-87-01129",
    owner: "A",
    addressLine1: "",
    addressLine2: "",
    phone: "02-597-3400",
    webSite: "www.cloocus.com",
    payAccount: "cloocus",
    bankName: "Hana",
    bankNumber: "164-910055-25504",
  },
  customerName: "TJMedia",
  subscriptionInfo: {
    customerRegName: "TJMedia",
    id: "subid",
    name: "subname",
  },
  billDetail: {
    startDate: "2020년 09월 01일",
    endDate: "2020년 09월 31일",
    numOfDays: 30,
    deadLine: "2020-10-31",
    yearMonth: "2020년 09월",
    avgDiscountRate: 5,
    discountAmount: 0,
    usageAmount: 0,
    chargeAmount: 0,
    unpaidAmount: 0,
    chargePlusUnpaid: 0,
    taxAmount: 0,
    totalCharge: 0,
  },
  usageSummary: {
    sum: {
      totalUsage: 0,
      totalDiscountAmount: 0,
    },
    items: [
      {
        serviceName: "SQL Database",
        usageAmount: 1775260,
        discountRate: 10,
        discountAmount: 177526,
      },
      {
        serviceName: "SQL Database   fsdfsa",
        usageAmount: 1775260,
        discountRate: 10,
        discountAmount: 177526,
      },
      {
        serviceName: "SQL Database",
        usageAmount: 1775260,
        discountRate: 10,
        discountAmount: 177526,
      },
    ],
  },
  barChart: {},
  doughnutChart: {},
};

app.get("/preview/:page", async (req, res) => {
  try {
    const billData = {...billDefaulData};
    billData.barChart = chartConfig2;
    billData.doughnutChart = doughtnutChart;
    const page = req.params.page;
    billData.barChartData = [
      ["Element", "요금", { role: "style" }],
      ["07월", 2500000, "color: #ff4868"],
      ["08월", 1300000, "color: #455072"],
      ["09월", 900000, "color: #455072"],
    ];

    billData.doughnutChartData = [
      ["Service", "Amount"],
      ["Compute", 11],
      ["DB", 2],
      ["Network", 2],
      ["Storage", 2],
      ["WebApp", 7],
    ];

    res.render(page, billData);
  } catch (error) {
    console.log(error);
    res.status(500).send();
  }
});

app.get("/pdf", async (req, res) => {
  try {
    //const page = req.params.page;
    const template = path.join(__dirname, "/views/", `bill.ejs`);
    const billData = { ...billDefaulData };
    billData.barChart = chartConfig2;

    billData.barChartData = [
      ["Element", "요금", { role: "style" }],
      ["07월", 320000, "color: #ff4868"],
      ["08월", 510000, "color: #455072"],
      ["09월", 310000, "color: #455072"],
    ];

    billData.doughnutChartData = [
      ["Service", "Amount"],
      ["Compute", 11],
      ["DB", 2],
      ["Network", 2],
      ["Storage", 2],
      ["WebApp", 7],
    ];

    billData.doughnutChart = doughtnutChart;
    const html = await ejs.renderFile(template, billData);
    pdf.create(html, landscapePreset).toBuffer(async (err, buff) => {
      if (err) {
        console.log(err);
        res.status(500).send(err);
      } else {
        res.contentType("application/pdf");
        res.send(buff);
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).send();
  }
});


app.listen(PORT, () => {
  console.log(`Serve is listenning on ${PORT}!`);
});
