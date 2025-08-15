import Swal from 'sweetalert2';

export const showSuccessDialog = (message) => {
    Swal.fire({
        title: 'Success',
        text: message,
        icon: 'success',
    });
}

export const showErrorDialog = (message) => {
    Swal.fire({
        title: 'Error',
        text: message,
        icon: 'error',
    });
}