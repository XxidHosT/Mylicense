// ============================================
// LICENSE SYSTEM - Google Apps Script
// ============================================
// Cara pakai:
// 1. Buka Google Sheets baru
// 2. Klik Extensions > Apps Script
// 3. Hapus semua code, paste script ini
// 4. Rename sheet1 jadi "Licenses"
// 5. Deploy > New deployment > Web app
//    - Execute as: Me
//    - Who has access: Anyone
// 6. Copy URL Web App, paste ke Discord Bot & Roblox Script
// ============================================

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var action = body.action;

  if (action === "add") {
    return handleAdd(body);
  }
  if (action === "revoke") {
    return handleRevoke(body);
  }

  return ContentService.createTextOutput(
    JSON.stringify({ success: false, error: "Unknown action" })
  ).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var action = e.parameter.action;

  if (action === "check") {
    return handleCheck(e.parameter);
  }

  return ContentService.createTextOutput(
    JSON.stringify({ success: false, error: "Unknown action" })
  ).setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// ADD - Tambah license baru
// ============================================
function handleAdd(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Licenses");
  if (!sheet) {
    sheet = ss.insertSheet("Licenses");
    sheet.appendRow(["userid", "placeid", "groupid", "status"]);
  }

  var userid = String(data.userid || "").trim();
  var placeid = String(data.placeid || "").trim();
  var groupid = String(data.groupid || "").trim();

  // Minimal 1 field harus ada
  if (!userid && !placeid && !groupid) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: "Minimal 1 field harus diisi (userid/placeid/groupid)" })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  // Cek duplikat berdasarkan kombinasi yang ada
  var existing = findExistingRow(sheet, userid, placeid, groupid);
  if (existing > 0) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: "License sudah ada di baris " + existing })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  // Tambah baris baru
  sheet.appendRow([userid, placeid, groupid, "lifetime"]);

  return ContentService.createTextOutput(
    JSON.stringify({
      success: true,
      message: "License ditambahkan",
      data: { userid: userid, placeid: placeid, groupid: groupid, status: "lifetime" }
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// CHECK - Cek license valid atau tidak
// ============================================
function handleCheck(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Licenses");
  if (!sheet) {
    return ContentService.createTextOutput(
      JSON.stringify({ valid: false, error: "Sheet tidak ditemukan" })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  var placeid = String(params.placeid || "").trim();
  var userid = String(params.userid || "").trim();
  var groupid = String(params.groupid || "").trim();

  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var rowUserid = String(data[i][0]).trim();
    var rowPlaceid = String(data[i][1]).trim();
    var rowGroupid = String(data[i][2]).trim();
    var rowStatus = String(data[i][3]).trim();

    // Cek apakah baris ini cocok dengan query
    var match = true;

    if (placeid && rowPlaceid !== placeid) match = false;
    if (userid && rowUserid !== userid) match = false;
    if (groupid && rowGroupid !== groupid) match = false;

    // Harus ada minimal 1 query param
    if (!placeid && !userid && !groupid) {
      return ContentService.createTextOutput(
        JSON.stringify({ valid: false, error: "Minimal 1 parameter harus diisi" })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    if (match) {
      return ContentService.createTextOutput(
        JSON.stringify({
          valid: true,
          data: {
            userid: rowUserid,
            placeid: rowPlaceid,
            groupid: rowGroupid,
            status: rowStatus
          }
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(
    JSON.stringify({ valid: false, error: "License tidak ditemukan" })
  ).setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// REVOKE - Hapus/cabut license
// ============================================
function handleRevoke(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Licenses");
  if (!sheet) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: "Sheet tidak ditemukan" })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  var placeid = String(data.placeid || "").trim();
  var userid = String(data.userid || "").trim();
  var groupid = String(data.groupid || "").trim();

  var rows = findExistingRows(sheet, userid, placeid, groupid);
  if (rows.length === 0) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: "License tidak ditemukan" })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  // Hapus dari baris terakhir ke pertama agar index tidak geser
  for (var j = rows.length - 1; j >= 0; j--) {
    sheet.deleteRow(rows[j]);
  }

  return ContentService.createTextOutput(
    JSON.stringify({
      success: true,
      message: rows.length + " license berhasil dihapus"
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// HELPER - Cari baris yang cocok
// ============================================
function findExistingRow(sheet, userid, placeid, groupid) {
  var rows = findExistingRows(sheet, userid, placeid, groupid);
  return rows.length > 0 ? rows[0] : 0;
}

function findExistingRows(sheet, userid, placeid, groupid) {
  var data = sheet.getDataRange().getValues();
  var results = [];

  for (var i = 1; i < data.length; i++) {
    var rowUserid = String(data[i][0]).trim();
    var rowPlaceid = String(data[i][1]).trim();
    var rowGroupid = String(data[i][2]).trim();

    var match = true;

    // Semua field yang diisi harus cocok
    if (userid && rowUserid !== userid) match = false;
    if (placeid && rowPlaceid !== placeid) match = false;
    if (groupid && rowGroupid !== groupid) match = false;

    if (match && (userid || placeid || groupid)) {
      results.push(i + 1); // +1 karena baris pertama = header
    }
  }

  return results;
}
