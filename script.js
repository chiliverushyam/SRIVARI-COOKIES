document.getElementById("year").textContent = new Date().getFullYear();

function order(product) {
  const message = `Hi SRIVARI COOKIES, I would like to order ${product}.`;
  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
