var actualCode = '(' + function() {
    console.log("Rewriting...");
    document.open("text/html", "replace");
    document.write("<html>");
    document.write("<head><title>Moera</title></head>");
    document.write("<body><h1>Hello, Moera!</h1></body>");
    document.write("</html>");
    document.close();
} + ')();';
var script = document.createElement('script');
script.textContent = actualCode;
(document.head||document.documentElement).appendChild(script);
script.remove();
