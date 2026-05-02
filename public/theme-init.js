(function () {
  try {
    var root = document.documentElement;
    root.classList.remove("dark");
    root.classList.add("light");
    root.style.colorScheme = "light";
  } catch (e) {}
})();
