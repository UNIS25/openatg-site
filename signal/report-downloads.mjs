export function createExcelBlob(rows, columns, xlsx = globalThis.XLSX, sheetName = "Sheet1") {
  if (!xlsx) throw new Error("The local spreadsheet report library did not load.");
  const sheet = xlsx.utils.json_to_sheet(rows, { header: columns });
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, sheet, sheetName);
  const bytes = xlsx.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function wordDate(value) {
  const match = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[2]}/${match[1]}/${match[3]}` : String(value);
}

export async function createWordReport(rows, platforms, docxLibrary = globalThis.docx) {
  if (!docxLibrary) throw new Error("The local Word report library did not load.");
  const { Document, HeadingLevel, Packer, Paragraph } = docxLibrary;
  const children = [
    new Paragraph({
      text: "Weekly Social Media Performance Report",
      heading: HeadingLevel.HEADING_1,
    }),
  ];

  for (const platform of platforms) {
    const platformRows = rows
      .filter((row) => row.Platform === platform)
      .sort((left, right) => Number(right.Engagements) - Number(left.Engagements))
      .slice(0, 3);
    if (!platformRows.length) continue;
    children.push(
      new Paragraph({ text: `Top Posts — ${platform}`, heading: HeadingLevel.HEADING_2 }),
    );
    for (const row of platformRows) {
      children.push(
        new Paragraph({ text: String(row["Post text"]), bullet: { level: 0 } }),
        new Paragraph({ text: `Date: ${wordDate(row.Date)}` }),
        new Paragraph({ text: `Impressions: ${row.Impressions}` }),
        new Paragraph({ text: `Engagements: ${row.Engagements}` }),
        new Paragraph({
          text: `Reactions: ${row.Reactions} | Comments: ${row.Comments} | Shares: ${row.Shares}`,
        }),
        new Paragraph({ text: `View post: ${row.Link}` }),
      );
    }
  }

  const documentFile = new Document({ sections: [{ children }] });
  return Packer.toBlob(documentFile);
}
