import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { IconShieldCheck } from '@tabler/icons-react'
import { Button, Card, Center, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core'
import { useAuthStore } from '@/stores/auth'
import { api, ApiError } from '@/api/client'

const schema = z
  .object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm: z.string(),
  })
  .refine(data => data.password === data.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })

type FormValues = z.infer<typeof schema>

const Setup = () => {
  const completeSetup = useAuthStore(s => s.completeSetup)
  const navigate = useNavigate()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '', confirm: '' },
  })

  const onSubmit = async (values: FormValues) => {
    try {
      await api.system.setup(values.username, values.password)
      completeSetup()
      navigate('/login')
    } catch (err) {
      form.setError('root', { message: err instanceof ApiError ? err.message : 'Network error' })
    }
  }

  return (
    <Center mih="100vh">
      <Card shadow="sm" padding="lg" radius="md" withBorder w={400} maw="100%">
        <Stack align="center" gap="xs" mb="md">
          <IconShieldCheck size={32} />
          <Title order={3}>Welcome to DHD</Title>
          <Text size="sm" c="dimmed">Create your admin account to get started</Text>
        </Stack>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Username"
              autoFocus
              autoComplete="username"
              error={form.formState.errors.username?.message}
              {...form.register('username')}
            />
            <PasswordInput
              label="Password"
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
              error={form.formState.errors.password?.message}
              {...form.register('password')}
            />
            <PasswordInput
              label="Confirm password"
              autoComplete="new-password"
              error={form.formState.errors.confirm?.message}
              {...form.register('confirm')}
            />
            {form.formState.errors.root && (
              <Text c="red" size="sm">{form.formState.errors.root.message}</Text>
            )}
            <Button type="submit" fullWidth loading={form.formState.isSubmitting}>
              Create account
            </Button>
          </Stack>
        </form>
      </Card>
    </Center>
  )
}

export default Setup
