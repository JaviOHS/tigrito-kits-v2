# Spec 05: Image Zoom Modal, Info/Notifications Modals & Final Validation

## Objective
Complete interactive modals, accessibility attributes, and production build checks for Cloudflare Pages deployment.

## Requirements
1. **`ModalShell.vue`:** Accessible base modal (`role="dialog"`, `aria-modal="true"`, `Esc` key close, backdrop click close, body scroll lock).
2. **`KitDetailModal.vue`:** Full-size image preview with zoom toggle, keyboard arrows (`ArrowLeft`/`ArrowRight`) to navigate visible kits, full kit metadata, and direct WhatsApp order button.
3. **`NotificationsModal.vue` & `InfoModal.vue`:** Render dynamic lists from `notifications.json` and business rules (payment methods, reservations, local delivery in Milagro) from `store.json`.
4. **Final Audit:** Ensure zero console warnings, clean `npm run build` output under 250 KB (excluding external Supabase images), and verify `.env.example` documentation.

## Validation Criteria
- `npm run build` and `npm run preview` run cleanly without errors.
- All keyboard shortcuts (`Esc`, Left/Right arrows) and WhatsApp links work accurately.
