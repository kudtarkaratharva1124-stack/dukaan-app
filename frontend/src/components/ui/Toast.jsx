import toast from "react-hot-toast";

export const notify = {
  success: (msg) => toast.success(msg),
  error: (msg) => toast.error(msg),
  info: (msg) => toast(msg, { icon: "ℹ️" }),
  loading: (msg) => toast.loading(msg),
  dismiss: (id) => toast.dismiss(id)
};

export default notify;
