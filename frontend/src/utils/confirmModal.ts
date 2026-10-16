import Swal from 'sweetalert2';

export const confirmDelete = async (options?: {
  title?: string;
  text?: string;
  confirmButtonText?: string;
}): Promise<boolean> => {
  const result = await Swal.fire({
    title: options?.title || 'Are you sure?',
    text: options?.text || 'This action cannot be undone.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: options?.confirmButtonText || 'Yes, delete',
    cancelButtonText: 'Cancel',
    reverseButtons: true,
    background: '#121215',
    color: '#ffffff',
    iconColor: '#f87171',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#27272a',
    customClass: {
      popup: '!bg-[#121215] !border !border-[#27272a] !rounded-2xl !shadow-2xl !font-sans',
      title: '!text-base !font-bold !text-white',
      htmlContainer: '!text-xs !text-[#a1a1aa]',
      confirmButton: '!px-4 !py-2 !rounded-xl !text-xs !font-semibold !shadow-md !cursor-pointer',
      cancelButton: '!px-4 !py-2 !rounded-xl !text-xs !font-semibold !text-[#a1a1aa] hover:!text-white !cursor-pointer'
    }
  });

  return result.isConfirmed;
};

export const confirmLogout = async (options?: {
  title?: string;
  text?: string;
}): Promise<boolean> => {
  const result = await Swal.fire({
    title: options?.title || 'Sign Out?',
    text: options?.text || 'Are you sure you want to end your current session?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sign Out',
    cancelButtonText: 'Cancel',
    reverseButtons: true,
    background: '#121215',
    color: '#ffffff',
    iconColor: '#60a5fa',
    confirmButtonColor: '#2563eb',
    cancelButtonColor: '#27272a',
    customClass: {
      popup: '!bg-[#121215] !border !border-[#27272a] !rounded-2xl !shadow-2xl !font-sans',
      title: '!text-base !font-bold !text-white',
      htmlContainer: '!text-xs !text-[#a1a1aa]',
      confirmButton: '!px-4 !py-2 !rounded-xl !text-xs !font-semibold !shadow-md !cursor-pointer',
      cancelButton: '!px-4 !py-2 !rounded-xl !text-xs !font-semibold !text-[#a1a1aa] hover:!text-white !cursor-pointer'
    }
  });

  return result.isConfirmed;
};
