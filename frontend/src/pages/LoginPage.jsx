import { useState } from 'react'
import { Alert, Box, Button, Group, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDocumentTitle } from '@mantine/hooks'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/context.js'

function errorMessage(error) {
  if (error.status === 401) return 'That email and password don’t match.'
  return error.message || 'Something went wrong. Try again.'
}

// The account offered on the sign in page for demos. A build shows it only when VITE_DEMO_EMAIL and
// VITE_DEMO_PASSWORD are set; in development it falls back to the seed script's first HR user.
function demoAccount() {
  const env = import.meta.env
  if (env.VITE_DEMO_EMAIL && env.VITE_DEMO_PASSWORD) return { email: env.VITE_DEMO_EMAIL, password: env.VITE_DEMO_PASSWORD }
  if (env.DEV) return { email: 'hr1@acme.test', password: 'password123' }
  return null
}

export default function LoginPage() {
  useDocumentTitle('Sign in · ACME Salary')
  const { isSignedIn, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email: (value) => (value.trim() ? null : 'Enter your email'),
      password: (value) => (value ? null : 'Enter your password'),
    },
  })

  if (isSignedIn) return <Navigate to="/employees" replace />
  const demo = demoAccount()

  async function handleSubmit({ email, password }) {
    setError(null)
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate(location.state?.from?.pathname ?? '/employees', { replace: true })
    } catch (e) {
      setError(errorMessage(e))
      setSubmitting(false)
    }
  }

  return (
    <Box mih="100vh" display="flex" p="md" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Stack w="100%" maw={400} gap="lg">
        <Stack align="center" gap={6} ta="center">
          <Box
            w={44}
            h={44}
            bg="brand.7"
            c="white"
            fw={700}
            fz={20}
            display="flex"
            style={{ borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
          >
            A
          </Box>
          <Title order={1} fz={24}>
            Welcome back
          </Title>
          <Text c="dimmed">Sign in to ACME Salary with your HR account</Text>
        </Stack>
        <Paper component="form" onSubmit={form.onSubmit(handleSubmit)} withBorder shadow="sm" radius="lg" p="lg">
          <Stack gap="sm">
            {error && (
              <Alert color="red" variant="light" role="alert">
                {error}
              </Alert>
            )}
            <TextInput label="Email" type="email" autoComplete="username" {...form.getInputProps('email')} />
            <PasswordInput label="Password" autoComplete="current-password" {...form.getInputProps('password')} />
            <Button type="submit" loading={submitting} mt={4}>
              Sign in
            </Button>
          </Stack>
        </Paper>
        {demo && (
          <Paper withBorder radius="lg" p="md" bg="brand.0">
            <Group justify="space-between" wrap="nowrap" gap="sm">
              <Box>
                <Text size="sm" fw={600}>
                  Demo account
                </Text>
                <Text size="sm" c="dimmed">
                  {demo.email} · {demo.password}
                </Text>
              </Box>
              <Button
                variant="light"
                size="xs"
                onClick={() => {
                  form.setValues(demo)
                  setError(null)
                }}
              >
                Use demo account
              </Button>
            </Group>
          </Paper>
        )}
        <Text size="sm" c="dimmed" ta="center">
          No account? Ask your administrator — accounts aren’t self-service.
        </Text>
      </Stack>
    </Box>
  )
}
