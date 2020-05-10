# Moera Browser Extension

Read more about Moera at https://moera.org

Learn more about Moera browser extension:
http://moera.org/overview/browser-extension.html

Bugs and feature requests: https://github.com/MoeraOrg/moera-issues/issues

How to setup a complete Moera Development Environment:
http://moera.org/development/setup/index.html

Installation instructions:

1. As prerequisites you need to have Node.js 8.12+ and Yarn installed.
2. Go to the source directory.
3. Install project dependencies:
   ```
   yarn install
   ```
4. Build the project:
   ```
   yarn build
   ```
5. Install the extension into your browser using `addon/manifest.json` manifest
   file.

   How to install an extension temporarily in Firefox:
   https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Temporary_Installation_in_Firefox

   How to install an extension temporarily in Chrome:
   https://developer.chrome.com/extensions/getstarted#manifest

   **Note:** An extension installed this way (in development mode) need to be
   reinstalled every time after browser was closed.

6. In the browser, open the extension settings and set the URL of the [server
   that serves the web client][1]. Save the settings.
7. Make sure that the [node][2] and the server that serves the web client are
   up and running. The [naming server][3] is also needed for node and client
    to work properly.
8. In the browser, open the main page of the node. The browser extension should
   replace it automatically with the web client interface.

[1]: https://github.com/MoeraOrg/moera-client-react
[2]: https://github.com/MoeraOrg/moera-node
[3]: https://github.com/MoeraOrg/moera-naming
