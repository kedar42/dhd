import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { IconShieldCheck } from '@tabler/icons-react'
import { Button, Card, Center, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core'
import { useAuthStore } from '@/stores/auth'

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

const Login = () => {
  const login = useAuthStore(s => s.login)
  const navigate = useNavigate()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
  })

  const onSubmit = async (values: FormValues) => {
    try {
      await login(values.username, values.password)
      navigate('/')
    } catch (err) {
      form.setError('root', { message: err instanceof Error ? err.message : 'Login failed' })
    }
  }

  return (
    <Center mih="100vh">
      <Card shadow="sm" padding="lg" radius="md" withBorder w={400} maw="100%">
        <Stack align="center" gap="xs" mb="md">
          <IconShieldCheck size={32} />
          <Title order={3}>DHD</Title>
          <Text size="sm" c="dimmed">Sign in to manage your WireGuard server</Text>
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
              autoComplete="current-password"
              error={form.formState.errors.password?.message}
              {...form.register('password')}
            />
            {form.formState.errors.root && (
              <Text c="red" size="sm">{form.formState.errors.root.message}</Text>
            )}
            <Button type="submit" fullWidth loading={form.formState.isSubmitting}>
              Sign in
            </Button>
          </Stack>
        </form>
      </Card>
    </Center>
  )
}

export default Login
