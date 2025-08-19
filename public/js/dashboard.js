document.addEventListener("DOMContentLoaded", function () { 
  let selectedLeadCard = null;

  const filterButtons = document.querySelectorAll(".filter-btn");
  const tabCardsContainer = document.querySelector(".tab-cards"); // <-- sirf tabs ke niche
  const leadRows = tabCardsContainer.querySelectorAll(".lead-row"); // <-- yahan query

  filterButtons.forEach(button => {
    button.addEventListener("click", () => {
      // Reset button styles
      filterButtons.forEach(btn => {
        btn.classList.remove("btn-primary");
        btn.classList.add("btn-outline-primary");
      });
      button.classList.add("btn-primary");
      button.classList.remove("btn-outline-primary");

      const btnId = button.id;

      leadRows.forEach(card => {
        const hasAccepted = card.querySelector(".material-icons.text-success")?.textContent.trim() === "check_circle";
        const hasScheduled = card.querySelector(".bi.bi-calendar-check") !== null;
        const hasRejected = card.querySelector(".bi.bi-x-circle-fill") !== null;

        // Filter logic
        if (btnId === "allBtn") {
          card.style.display = "flex";
        } else if (btnId === "acceptedBtn") {
          card.style.display = hasAccepted ? "flex" : "none";
        } else if (btnId === "scheduledBtn") {
          card.style.display = hasScheduled ? "flex" : "none";
        } else if (btnId === "rejectedBtn") {
          card.style.display = hasRejected ? "flex" : "none";
        }
      });
    });
  });
  
  const searchInput = document.querySelector('input[placeholder="Search leads"]');
  const leadCards = document.querySelectorAll('#leadCardList .lead-card');

  searchInput.addEventListener('input', function() {
    const query = this.value.toLowerCase();

    leadCards.forEach(card => {
      const pickup = card.dataset.pickup.toLowerCase();
      const destination = card.dataset.destination.toLowerCase();
      const name = card.dataset.name.toLowerCase();

      if (pickup.includes(query) || destination.includes(query) || name.includes(query)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  });


});
