import { useLocation, useNavigate } from 'react-router-dom'
import { type Icon } from '@tabler/icons-react'
import { NavLink, Stack } from '@mantine/core'

type NavItem = {
  title: string
  url: string
  icon: Icon
}

export const NavMain = ({ items }: { items: NavItem[] }) => {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <Stack gap={4} p="xs">
      {items.map(item => (
        <NavLink
          key={item.url}
          label={item.title}
          leftSection={<item.icon size={18} />}
          active={pathname === item.url}
          onClick={() => navigate(item.url)}
        />
      ))}
    </Stack>
  )
}
