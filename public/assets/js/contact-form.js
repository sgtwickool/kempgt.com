// Contact form thank you logic
// Requires: thankYouCard div and Formspree form

document.addEventListener("DOMContentLoaded", function () {
  var contactForm = document.querySelector(
    'form[action^="https://formspree.io/"]'
  );
  var thankYouCard = document.getElementById("thankYouCard");
  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var formData = new FormData(contactForm);
      fetch(contactForm.action, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      })
        .then(function (response) {
          if (response.ok) {
            contactForm.style.display = "none";
            thankYouCard.style.display = "block";
            if (window.AOS) AOS.refresh();
          } else {
            response.json().then(function (data) {
              alert(
                data.error || "Oops! There was a problem submitting your form."
              );
            });
          }
        })
        .catch(function (error) {
          alert("Oops! There was a problem submitting your form.");
        });
    });
  }
});
