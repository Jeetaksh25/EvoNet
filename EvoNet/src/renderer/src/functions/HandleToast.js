import { toast } from 'react-toastify'

export const handleToast = async (type, message) => {
  if (type === 'error') {
    toast.error(message)
  } else if (type === 'success') {
    toast.success(message)
  } else if (type === 'info') {
    toast.info(message)
  } else if (type === 'warning') {
    toast.warning(message)
  } else {
    console.error('Invalid toast type:', type)
  }
}
