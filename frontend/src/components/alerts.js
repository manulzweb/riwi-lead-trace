import Swal from 'sweetalert2';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  }
});

export const showToast = (title, icon = 'success', text = '') => {
  return Toast.fire({ icon, title, text });
};

export const showConfirm = async (title, html = '', icon = 'warning') => {
  const result = await Swal.fire({
    title,
    html,
    icon,
    showDenyButton: true,
    confirmButtonText: 'Sí',
    denyButtonText: 'Cancelar',
    customClass: {
      popup: 'swal-custom-popup',
      title: 'swal-custom-title',
      confirmButton: 'swal-btn-confirm',
      denyButton: 'swal-btn-deny',
      icon: 'swal-custom-icon'
    }
  });

  return result.isConfirmed;
};

export const showError = (title, text = '') => {
  return Swal.fire({
    icon: 'error',
    title: title || 'Error',
    text: text || 'Ocurrió un error inesperado',
    confirmButtonColor: '#dc2626'
  });
};
