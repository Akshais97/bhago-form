# temp-lead-capture (TEMPORARY)

Stores BhaGoMo iRide enquiries in a Google Sheet while the site is on a static host (GitHub Pages)
and before the CRM endpoint exists. GitHub Pages cannot receive form posts, which is why the page
showed `Error code: METHOD_NOT_ALLOWED`.

Nothing here changes how the page talks to the CRM: the Apps Script answers with the same contract
(`{"status":"saved"|"duplicate"}` / `{"error":{"code","message","field"}}`), and the page logs the
same `[BhaGoMo lead] CODE: …` console errors.

## Set up (about 5 minutes)

1. Create a new Google Sheet (for example "BhaGoMo iRide Leads").
2. In the sheet: **Extensions → Apps Script**. Delete the sample code, paste all of `apps-script.gs`, click **Save**.
3. In the function dropdown pick **setup**, click **Run**, and approve the permissions.
   This creates the **Leads** tab and a **Summary** tab (total, station-wise, plan-wise counts).
4. **Deploy → New deployment →** type **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
   Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).
5. Open `lead-config.js` in this folder and paste that URL into `url: ""`.
6. Commit and push to GitHub. Submit a test enquiry and check the Leads tab.

If you change `apps-script.gs` later, use **Deploy → Manage deployments → Edit → New version**
so the same URL keeps working.

## Checking errors

Open the browser console on the live page. Every failed submission logs
`[BhaGoMo lead] <CODE>: <detail>` with the HTTP status, endpoint and the server's response.
Opening the `/exec` URL directly in a browser shows `METHOD_NOT_ALLOWED`; that is expected.

## Remove after CRM integration

1. Delete this `temp-lead-capture/` folder.
2. In `index.html`, delete the line marked `TEMPORARY lead capture` and the
   `<script src="temp-lead-capture/lead-config.js"></script>` line under it.
3. Set `LEAD_API.url` in `index.html` to the CRM endpoint (and `LEAD_API.headers` if it needs a key).

Note: the web-app URL is visible in the page source, so anyone could post to it. The script validates
every field and ignores duplicate numbers, which is fine for a temporary capture, not for production.
