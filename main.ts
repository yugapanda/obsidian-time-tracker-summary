import { App, Editor, FileSystemAdapter, MarkdownPostProcessorContext, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, Vault } from 'obsidian';
import { groupBy } from './arrayutil';
import { toTimeFormat } from './timeutil';
import { ChartConfiguration, ChartData, Chart, registerables } from 'chart.js';
// Remember to rename these classes and interfaces!


const pieChartConfig = (data: ChartData): ChartConfiguration => {
  return {
    type: "pie",
    data: data,
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Time Tracker Summary'
        }
      }
    },
  }
}

/**
 * 警告文を追加する
 * @param el 
 * @param text 
 */
const makeWarnEl = (el: HTMLElement, text: string) => {
  el.createEl("p", { text, attr: { style: "color: red; font-size: 11px" } });
}

/**
 * 情報文を追加する
 * @param el 
 * @param text 
 */
const makeInfoEl = (el: HTMLElement, text: string, fontSize: number = 11) => {
  el.createEl("p", { text, attr: { style: `color: green; font-size: ${fontSize}px` } });
}

const makeBlockView = async (
  source: string,
  el: HTMLElement,
  ctx: MarkdownPostProcessorContext,
  vault: Vault
) => {
  const rows = source.split("\n");
  const file = rows.find(x => x.includes("file:"));
  const section = rows.find(x => x.includes("section:"));
  if (file === undefined) {
    makeWarnEl(el, "file is not defined");
    return;
  }
  if (section === undefined) {
    makeWarnEl(el, "section is not defined");
    return;
  }
  const [, fileName] = file.split(":")
  const [, sectionName] = section.split(":")

  if (fileName === undefined) {
    makeWarnEl(el, "file value is not defined");
    return;
  }
  if (sectionName === undefined) {
    makeWarnEl(el, "section value is not defined");
    return;
  }
  makeInfoEl(el, `file: ${fileName} | section: ${sectionName}`);

  const targetFile = vault.getMarkdownFiles().find(x => x.basename === fileName);

  if (targetFile === undefined) {
    makeWarnEl(el, "target file is not found");
    return;
  }

  const fileContent = (await vault.read(targetFile)).split("\n");
  const sectionIndex = fileContent.findIndex(x => x.includes(sectionName));
  if (sectionIndex === -1) {
    makeWarnEl(el, "section in target file is not found");
    return;
  }
  const nextSectionIndex = fileContent.slice(sectionIndex + 1).findIndex(x => x.startsWith("#"));
  const sectionContent = fileContent.slice(sectionIndex, sectionIndex + nextSectionIndex);

  const times = sectionContent
    .map(x => x.replace(/`/g, ""))
    .map(x => x.split(":"))
    .map((x) => { return { title: x[0], h: x[1], m: x[2], s: x[3] } })
    .filter(x => x.h !== undefined);

  const grouped = groupBy(times, x => x.title);

  const summary = Object.entries(grouped).map(([key, value]) => {
    const sum = value.reduce((acc, cur) => {
      return acc + Number(cur.h) * 60 * 60 + Number(cur.m) * 60 + Number(cur.s);
    }, 0);
    return { title: key, sum };
  });

  const total = summary.reduce((acc, cur) => acc + cur.sum, 0);

  const summaryWithPercentage = summary.map(x => {
    return { title: x.title, sum: x.sum, percentage: (x.sum / total * 100).toFixed(2) };
  })

  summaryWithPercentage.forEach(x => {
    makeInfoEl(el, `${x.title}: ${toTimeFormat(x.sum)}, ${x.percentage}%`, 14);
  });

  const canvas = el.createEl("canvas", { attr: { id: "chart-container" } });
  const context = canvas.getContext("2d");
  if (context === null) {
    makeWarnEl(el, "chart container is not found");
    return;
  }
  Chart.register(...registerables);
  const chart = new Chart(
    context,
    pieChartConfig(
      {
        labels: summaryWithPercentage.map(x => x.title),
        datasets: [{
          data: summaryWithPercentage.map(x => Number(x.percentage)),
          backgroundColor: summaryWithPercentage.map((_, i) => `hsl(${i * 360 / summaryWithPercentage.length}, 100%, 50%)`),
        }]
      }
    )
  );

}

export default class MyPlugin extends Plugin {

  async onload() {
    this.registerMarkdownCodeBlockProcessor("timeTracker", (source, el, ctx) => {
      makeBlockView(source, el, ctx, this.app.vault);
    });
  }
}