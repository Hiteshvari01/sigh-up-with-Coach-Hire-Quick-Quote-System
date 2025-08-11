document.addEventListener("DOMContentLoaded", function () { 
    let selectedLeadCard = null;  // <-- yeh variable yahan define karo

  const filterButtons = document.querySelectorAll(".filter-btn");
  const leadRows = document.querySelectorAll(".lead-row");

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
});

// Example
document.querySelectorAll('.material-icons.text-primary, .bi-chevron-right').forEach(icon => {
  icon.addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('collapsed');
    document.getElementById('mainContent').classList.add('detail-visible');
  });

 // Delete button logic
  const deleteBtn = document.getElementById("deleteLeadBtn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      if (selectedLeadCard) {
        if (confirm("Are you sure you want to delete this lead?")) {
          selectedLeadCard.remove();

          // Hide detail view
          document.getElementById("mainContent").classList.remove("detail-visible");
          document.getElementById("sidebar").classList.remove("collapsed");

          selectedLeadCard = null;
        }
      }
    });
  }
})