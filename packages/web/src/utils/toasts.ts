import { toast } from "react-toastify";

export const successMessage = (message: string) => {
  toast.success(message);
};
export const infoMessage = (message: string) => {
  toast.info(message);
};
export const warningMessage = (message: string) => {
  toast.warning(message);
};
export const errorMessage = (message: string) => {
  toast.error(message);
};
