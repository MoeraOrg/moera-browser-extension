let actualCode = '(' + function() {
    fetch("%URL%")
        .then(response => {
            if (response.ok) {
                return response.text();
            }
            throw new Error("Client download failed.");
        })
        .then(text => {
            const content = text.replace(
                /<head>/i,
                "<head><base href='%URL%'>");
            document.open("text/html", "replace");
            document.write(content);
            document.close();
        })
        .catch(error => {
            alert("Cannot open Moera client page: " + error.message);
        });
} + ')();';

(browser||chrome).storage.local.get("settings")
    .then(({settings}) => {
        if (settings.clientUrl) {
            actualCode = actualCode.replace(/%URL%/g, settings.clientUrl);
            let script = document.createElement("script");
            script.textContent = actualCode;
            (document.head||document.documentElement).appendChild(script);
        } else {
            const ok = window.confirm(
                "Moera client URL is not set in the add-on settings. "
                + "Open the settings page?");
            if (ok) {
                (browser||chrome).runtime.sendMessage({action: "openOptions"});
            }
        }
    });
