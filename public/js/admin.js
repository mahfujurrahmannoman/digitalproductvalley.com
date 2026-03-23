// Admin-specific JS
document.addEventListener('DOMContentLoaded', () => {
  // Confirm dangerous actions
  document.querySelectorAll('[data-confirm]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (!confirm(el.dataset.confirm || 'Are you sure?')) {
        e.preventDefault();
      }
    });
  });

  // Toggle switches
  document.querySelectorAll('.toggle-switch').forEach(el => {
    el.addEventListener('change', async () => {
      const url = el.dataset.url;
      const field = el.dataset.field;
      if (!url) return;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: el.checked }),
        });
        if (!res.ok) throw new Error('Failed');
      } catch (err) {
        el.checked = !el.checked;
        alert('Failed to update');
      }
    });
  });
});
