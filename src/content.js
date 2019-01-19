var actualCode = '(' + function() {
    fetch("%URL%")
        .then(response => {
            if (response.ok) {
                return response.text();
            }
            throw new Error("Client download failed.");
        })
        .then(text => {
            var content = text.replace(
                /<head>/i,
                "<head><base href='%URL%'>");
            document.open("text/html", "replace");
            document.write(content);
            document.close();
        })
        .catch(function(error) {
            alert("Cannot open Moera client page: " + error.message);
        });
} + ')();';
browser.storage.local.get()
    .then(settings => {
        if (settings.clientUrl) {
            actualCode = actualCode.replace(/%URL%/g, settings.clientUrl);
            var script = document.createElement("script");
            script.textContent = actualCode;
            (document.head||document.documentElement).appendChild(script);
        } else {
            var ok = window.confirm(
                "Moera client URL is not set in the add-on settings. "
                + "Open the settings page?");
            if (ok) {
                browser.runtime.sendMessage("openOptions");
            }
        }
    });
