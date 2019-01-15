function rewrite() {
console.log("Rewriting...");
/*document.open("text/html", "replace");
document.write("<html>");
document.write("<head><title>Moera</title></head>");
document.write("<body><h1>Hello, Moera!</h1></body>");
document.write("</html>");
document.close();*/
document.body.textContent = "";
}

setTimeout(rewrite, 2000);
