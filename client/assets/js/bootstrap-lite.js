(function bootstrapLiteBootstrap(global) {
  class Modal {
    constructor(element) {
      this.element = element;
      this.boundBackdrop = this.handleBackdropClick.bind(this);
      this.boundEscape = this.handleEscape.bind(this);
      this.element.addEventListener("click", this.boundBackdrop);
    }

    show() {
      document.body.classList.add("modal-open");
      this.element.classList.add("show");
      this.element.removeAttribute("aria-hidden");
      this.element.setAttribute("aria-modal", "true");
      this.element.dataset.open = "true";
      const firstFocusable = this.element.querySelector("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
      if (firstFocusable instanceof HTMLElement) {
        setTimeout(() => firstFocusable.focus(), 0);
      }
      document.addEventListener("keydown", this.boundEscape);
      this.dispatch("shown.bs.modal");
    }

    hide() {
      if (this.element.contains(document.activeElement)) {
        document.activeElement.blur();
      }
      this.element.classList.remove("show");
      this.element.setAttribute("aria-hidden", "true");
      this.element.removeAttribute("aria-modal");
      this.element.dataset.open = "false";
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", this.boundEscape);
      this.dispatch("hidden.bs.modal");
    }

    handleBackdropClick(event) {
      const dismissTrigger = event.target.closest("[data-bs-dismiss='modal']");
      if (dismissTrigger) {
        this.hide();
        return;
      }

      if (event.target === this.element) {
        this.hide();
      }
    }

    handleEscape(event) {
      if (event.key === "Escape") {
        this.hide();
      }
    }

    dispatch(name) {
      this.element.dispatchEvent(new CustomEvent(name, { bubbles: true }));
    }

    static getOrCreateInstance(element) {
      if (!element.__bootstrapLiteModal) {
        element.__bootstrapLiteModal = new Modal(element);
      }
      return element.__bootstrapLiteModal;
    }

    static getInstance(element) {
      return element.__bootstrapLiteModal || null;
    }
  }

  global.bootstrap = global.bootstrap || {};
  global.bootstrap.Modal = Modal;
})(window);
