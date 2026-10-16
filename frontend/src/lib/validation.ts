import { z } from 'zod';

export const VALIDATION_LIMITS = {
  EMAIL_MAX: 150,
  NAME_MIN: 2,
  NAME_MAX: 100,
  PASSWORD_MIN: 6,
  PASSWORD_MAX: 100,
  TASK_TITLE_MIN: 1,
  TASK_TITLE_MAX: 200,
  TASK_DESC_MAX: 50000,
  COMMENT_MIN: 1,
  COMMENT_MAX: 2000,
  ROLE_KEY_MIN: 2,
  ROLE_KEY_MAX: 50,
  ROLE_NAME_MIN: 2,
  ROLE_NAME_MAX: 100,
  ROLE_DESC_MAX: 255,
} as const;

export const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .max(VALIDATION_LIMITS.EMAIL_MAX, `Email must not exceed ${VALIDATION_LIMITS.EMAIL_MAX} characters`)
    .email('Invalid email address format'),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(VALIDATION_LIMITS.PASSWORD_MAX, `Password must not exceed ${VALIDATION_LIMITS.PASSWORD_MAX} characters`),
});

export const ForgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .max(VALIDATION_LIMITS.EMAIL_MAX, `Email must not exceed ${VALIDATION_LIMITS.EMAIL_MAX} characters`)
    .email('Invalid email address format'),
});

export const ResetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(VALIDATION_LIMITS.PASSWORD_MIN, `Password must be at least ${VALIDATION_LIMITS.PASSWORD_MIN} characters`)
      .max(VALIDATION_LIMITS.PASSWORD_MAX, `Password must not exceed ${VALIDATION_LIMITS.PASSWORD_MAX} characters`),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const TaskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(VALIDATION_LIMITS.TASK_TITLE_MIN, 'Task title cannot be empty.')
    .max(VALIDATION_LIMITS.TASK_TITLE_MAX, `Title must not exceed ${VALIDATION_LIMITS.TASK_TITLE_MAX} characters`),
  description: z
    .string()
    .trim()
    .max(VALIDATION_LIMITS.TASK_DESC_MAX, `Description cannot exceed ${VALIDATION_LIMITS.TASK_DESC_MAX} characters`)
    .optional()
    .or(z.literal('')),
  priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  category: z.enum(['DESIGN', 'DEVELOPMENT', 'DEVOPS', 'TESTING', 'MARKETING', 'RESEARCH', 'OPERATIONS']).default('DEVELOPMENT'),
  columnId: z.number().int().positive().optional(),
  assigneeId: z.union([z.number(), z.null()]).optional(),
  dueDate: z.string().optional().or(z.literal('')),
});

export const CommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(VALIDATION_LIMITS.COMMENT_MIN, 'Comment cannot be empty')
    .max(VALIDATION_LIMITS.COMMENT_MAX, `Comment cannot exceed ${VALIDATION_LIMITS.COMMENT_MAX} characters`),
});

export const CreateUserSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .max(VALIDATION_LIMITS.EMAIL_MAX, `Email must not exceed ${VALIDATION_LIMITS.EMAIL_MAX} characters`)
    .email('Invalid email address format'),
  fullName: z
    .string()
    .trim()
    .min(VALIDATION_LIMITS.NAME_MIN, `Full name must be at least ${VALIDATION_LIMITS.NAME_MIN} characters`)
    .max(VALIDATION_LIMITS.NAME_MAX, `Full name must not exceed ${VALIDATION_LIMITS.NAME_MAX} characters`),
  password: z
    .string()
    .min(VALIDATION_LIMITS.PASSWORD_MIN, `Password must be at least ${VALIDATION_LIMITS.PASSWORD_MIN} characters`)
    .max(VALIDATION_LIMITS.PASSWORD_MAX, `Password must not exceed ${VALIDATION_LIMITS.PASSWORD_MAX} characters`),
  role: z
    .string()
    .trim()
    .min(VALIDATION_LIMITS.ROLE_KEY_MIN, `Role key must be at least ${VALIDATION_LIMITS.ROLE_KEY_MIN} characters`)
    .max(VALIDATION_LIMITS.ROLE_KEY_MAX, `Role key must not exceed ${VALIDATION_LIMITS.ROLE_KEY_MAX} characters`),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE'),
});

export const EditUserSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .max(VALIDATION_LIMITS.EMAIL_MAX, `Email must not exceed ${VALIDATION_LIMITS.EMAIL_MAX} characters`)
    .email('Invalid email address format'),
  fullName: z
    .string()
    .trim()
    .min(VALIDATION_LIMITS.NAME_MIN, `Full name must be at least ${VALIDATION_LIMITS.NAME_MIN} characters`)
    .max(VALIDATION_LIMITS.NAME_MAX, `Full name must not exceed ${VALIDATION_LIMITS.NAME_MAX} characters`),
  password: z
    .string()
    .min(VALIDATION_LIMITS.PASSWORD_MIN, `Password must be at least ${VALIDATION_LIMITS.PASSWORD_MIN} characters`)
    .max(VALIDATION_LIMITS.PASSWORD_MAX, `Password must not exceed ${VALIDATION_LIMITS.PASSWORD_MAX} characters`)
    .optional()
    .or(z.literal('')),
  role: z
    .string()
    .trim()
    .min(VALIDATION_LIMITS.ROLE_KEY_MIN, `Role key must be at least ${VALIDATION_LIMITS.ROLE_KEY_MIN} characters`)
    .max(VALIDATION_LIMITS.ROLE_KEY_MAX, `Role key must not exceed ${VALIDATION_LIMITS.ROLE_KEY_MAX} characters`),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
});

export const RoleFormSchema = z.object({
  key: z
    .string()
    .trim()
    .min(VALIDATION_LIMITS.ROLE_KEY_MIN, `Key must be at least ${VALIDATION_LIMITS.ROLE_KEY_MIN} characters`)
    .max(VALIDATION_LIMITS.ROLE_KEY_MAX, `Key must not exceed ${VALIDATION_LIMITS.ROLE_KEY_MAX} characters`)
    .regex(/^[A-Z0-9_]+$/, 'Key must be uppercase alphanumeric and underscores only (e.g. QA_ENGINEER)'),
  name: z
    .string()
    .trim()
    .min(VALIDATION_LIMITS.ROLE_NAME_MIN, `Name must be at least ${VALIDATION_LIMITS.ROLE_NAME_MIN} characters`)
    .max(VALIDATION_LIMITS.ROLE_NAME_MAX, `Name must not exceed ${VALIDATION_LIMITS.ROLE_NAME_MAX} characters`),
  description: z
    .string()
    .trim()
    .max(VALIDATION_LIMITS.ROLE_DESC_MAX, `Description cannot exceed ${VALIDATION_LIMITS.ROLE_DESC_MAX} characters`)
    .optional()
    .or(z.literal('')),
});

export const ProfileUpdateSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(VALIDATION_LIMITS.NAME_MIN, `Full name must be at least ${VALIDATION_LIMITS.NAME_MIN} characters`)
    .max(VALIDATION_LIMITS.NAME_MAX, `Full name must not exceed ${VALIDATION_LIMITS.NAME_MAX} characters`),
  avatarUrl: z
    .string()
    .trim()
    .max(255, 'Avatar URL cannot exceed 255 characters')
    .optional()
    .or(z.literal('')),
});

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(VALIDATION_LIMITS.PASSWORD_MIN, `New password must be at least ${VALIDATION_LIMITS.PASSWORD_MIN} characters`)
      .max(VALIDATION_LIMITS.PASSWORD_MAX, `New password must not exceed ${VALIDATION_LIMITS.PASSWORD_MAX} characters`),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * Helper to validate arbitrary data against a Zod schema and extract field errors.
 */
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T; errors: Record<string, string> } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: {} };
  }
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] ? String(issue.path[0]) : 'form';
    if (!errors[field]) {
      errors[field] = issue.message;
    }
  }
  return { success: false, errors };
}
