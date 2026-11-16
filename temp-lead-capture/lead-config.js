/* TEMPORARY — points the lead form at the Google Sheet (apps-script.gs in this folder)
   until the CRM endpoint is live. While `url` is empty, the page uses its normal LEAD_API settings.

   After CRM integration: delete this whole folder AND the marked <script src="temp-lead-capture/lead-config.js">
   line in index.html, then set LEAD_API.url in index.html to the CRM endpoint. */
window.BHAGOMO_TEMP_LEAD_API = {
  /* Paste the Apps Script web-app URL here (ends in /exec). */
  url: "",

  /* Apps Script cannot answer CORS preflight requests, so the JSON body is sent as text/plain
     (a "simple" request). The body is still JSON; the script parses it. Do not change. */
  contentType: "text/plain;charset=utf-8",
};
