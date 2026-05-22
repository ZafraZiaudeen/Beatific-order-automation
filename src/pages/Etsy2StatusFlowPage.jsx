import { Box, Typography, Paper, Chip } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import PsychologyIcon from '@mui/icons-material/Psychology'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined'
import EditIcon from '@mui/icons-material/Edit'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DescriptionIcon from '@mui/icons-material/Description'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import InfoIcon from '@mui/icons-material/Info'

const FlowStep = ({ number, title, icon: Icon, description, color, children }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minWidth: '180px',
    }}
  >
    <Box
      sx={{
        width: 120,
        height: 120,
        borderRadius: '16px',
        bgcolor: '#FFFFFF',
        border: '2px solid #E3E3E7',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        mb: 1.5,
        position: 'relative',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '12px',
          bgcolor: color || '#F4F4F5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 1,
        }}
      >
        <Icon sx={{ fontSize: '24px', color: '#27272A' }} />
      </Box>
      <Typography variant="caption" sx={{ color: '#71717A', fontWeight: 600, fontSize: '0.7rem' }}>
        {number}. {title}
      </Typography>
    </Box>
    <Typography
      variant="caption"
      sx={{
        color: '#71717A',
        textAlign: 'center',
        fontSize: '0.75rem',
        lineHeight: 1.4,
        maxWidth: '160px',
      }}
    >
      {description}
    </Typography>
    {children}
  </Box>
)

const FlowArrow = ({ label, color = '#71717A' }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      mx: 1,
      minWidth: '80px',
    }}
  >
    <ArrowForwardIcon sx={{ fontSize: '32px', color, mb: 0.5 }} />
    {label && (
      <Typography
        variant="caption"
        sx={{
          color,
          fontSize: '0.7rem',
          fontWeight: 600,
          textAlign: 'center',
        }}
      >
        {label}
      </Typography>
    )}
  </Box>
)

const StatusBadge = ({ label, color, bgColor, icon: Icon }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      p: 2,
      bgcolor: bgColor,
      borderRadius: '12px',
      border: `2px solid ${color}`,
      minWidth: '140px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    }}
  >
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: '8px',
        bgcolor: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mb: 1,
      }}
    >
      <Icon sx={{ fontSize: '20px', color: '#FFFFFF' }} />
    </Box>
    <Typography variant="caption" sx={{ color, fontWeight: 700, fontSize: '0.75rem', textAlign: 'center' }}>
      {label}
    </Typography>
  </Box>
)

export default function Etsy2StatusFlowPage() {
  const navigate = useNavigate()

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, color: '#27272A', mb: 1 }}>
          Etsy Order & AI Moderation Flow
        </Typography>
        <Typography variant="body2" sx={{ color: '#71717A', mb: 2 }}>
          This flow shows how orders move through the system — from import to fulfillment.
          AI moderation helps identify potentially problematic personalization before the order moves forward.
        </Typography>
      </Box>

      {/* Main Flow */}
      <Paper sx={{ p: 4, mb: 4, borderRadius: '16px', border: '1px solid #E3E3E7', overflow: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 4 }}>
          <FlowStep
            number="1"
            title="Imported"
            icon={CloudUploadIcon}
            description="Order is imported from Etsy into Order Manager"
            color="#E0F2FE"
          />

          <FlowArrow />

          <FlowStep
            number="2"
            title="AI Moderation"
            icon={PsychologyIcon}
            description="AI checks the personalization text for policy violations, inappropriate content, or sensitive terms"
            color="#FEF9C3"
          />

          <FlowArrow />

          <FlowStep
            number="3"
            title="Mapping Check"
            icon={CompareArrowsIcon}
            description="Is the order mapped to a product in your catalog?"
            color="#F3E8FF"
          />
        </Box>

        {/* Decision Point */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 2,
              height: 40,
              bgcolor: '#E3E3E7',
            }}
          />
        </Box>

        {/* Branching Paths */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, maxWidth: '200px' }}>
            <Typography
              variant="caption"
              sx={{
                color: '#EF4444',
                fontWeight: 700,
                mb: 2,
                bgcolor: '#FEE2E2',
                px: 2,
                py: 0.5,
                borderRadius: '6px',
              }}
            >
              If text is problematic
            </Typography>
            <StatusBadge
              label="4a. AI Flagged"
              color="#EF4444"
              bgColor="#FEE2E2"
              icon={WarningAmberIcon}
            />
            <Typography
              variant="caption"
              sx={{ color: '#71717A', textAlign: 'center', mt: 1, fontSize: '0.7rem', lineHeight: 1.4 }}
            >
              Text is potentially problematic. Review required.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, maxWidth: '200px' }}>
            <Typography
              variant="caption"
              sx={{
                color: '#71717A',
                fontWeight: 700,
                mb: 2,
                bgcolor: '#F4F4F5',
                px: 2,
                py: 0.5,
                borderRadius: '6px',
              }}
            >
              If product is not in library
            </Typography>
            <StatusBadge
              label="4b. Unmapped"
              color="#71717A"
              bgColor="#F4F4F5"
              icon={HelpOutlineIcon}
            />
            <Typography
              variant="caption"
              sx={{ color: '#71717A', textAlign: 'center', mt: 1, fontSize: '0.7rem', lineHeight: 1.4 }}
            >
              No matching product found in your product library.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, maxWidth: '200px' }}>
            <Typography
              variant="caption"
              sx={{
                color: '#F97316',
                fontWeight: 700,
                mb: 2,
                bgcolor: '#FFF7ED',
                px: 2,
                py: 0.5,
                borderRadius: '6px',
              }}
            >
              If details mismatch
            </Typography>
            <StatusBadge
              label="4c. Custom"
              color="#F97316"
              bgColor="#FFF7ED"
              icon={EditIcon}
            />
            <Typography
              variant="caption"
              sx={{ color: '#71717A', textAlign: 'center', mt: 1, fontSize: '0.7rem', lineHeight: 1.4 }}
            >
              Product found, but details (size, color, options) don't match.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, maxWidth: '200px' }}>
            <Typography
              variant="caption"
              sx={{
                color: '#0EA5E9',
                fontWeight: 700,
                mb: 2,
                bgcolor: '#E0F2FE',
                px: 2,
                py: 0.5,
                borderRadius: '6px',
              }}
            >
              If all match
            </Typography>
            <StatusBadge
              label="4d. Mapped"
              color="#0EA5E9"
              bgColor="#E0F2FE"
              icon={CheckCircleIcon}
            />
            <Typography
              variant="caption"
              sx={{ color: '#71717A', textAlign: 'center', mt: 1, fontSize: '0.7rem', lineHeight: 1.4 }}
            >
              All details match. Order moves forward.
            </Typography>
          </Box>
        </Box>

        {/* Convergence */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 2,
              height: 40,
              bgcolor: '#E3E3E7',
            }}
          />
        </Box>

        {/* Final Steps */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FlowStep
            number="5"
            title="In Progress"
            icon={DescriptionIcon}
            description="PDF is generated and the order is prepared for fulfillment"
            color="#F3E8FF"
          />

          <FlowArrow />

          <FlowStep
            number="6"
            title="Shipped"
            icon={LocalShippingIcon}
            description="Order is fulfilled by Lulu and marked as complete"
            color="#DCFCE7"
          />
        </Box>
      </Paper>

      {/* Legend */}
      <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid #E3E3E7' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <InfoIcon sx={{ color: '#0EA5E9', fontSize: '20px' }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#27272A' }}>
            About AI Moderation
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#71717A', lineHeight: 1.6 }}>
          AI moderation helps protect your store and customers by flagging orders that may contain inappropriate, harmful, or
          policy-violating content. Flagged orders require manual review before they can move forward.
        </Typography>
      </Paper>

      {/* Status Reference */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: '16px', border: '1px solid #E3E3E7' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#27272A', mb: 2 }}>
          Status Reference
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
          {[
            {
              label: '1. Imported',
              description: 'Order is imported from Etsy',
              color: '#E0F2FE',
            },
            {
              label: '2. AI Moderation',
              description: 'AI reviews personalization text for policy violations',
              color: '#FEF9C3',
            },
            {
              label: '3. Mapping Check',
              description: 'System checks if the order matches a product in your catalog',
              color: '#F3E8FF',
            },
            {
              label: '4a. AI Flagged',
              description: 'Text is potentially problematic. Manual review required.',
              color: '#FEE2E2',
            },
            {
              label: '4b. Unmapped',
              description: 'No matching product found in your product library',
              color: '#F4F4F5',
            },
            {
              label: '4c. Custom',
              description: 'Product found, but details don\'t match. Needs review.',
              color: '#FFF7ED',
            },
            {
              label: '4d. Mapped',
              description: 'All details match. Order moves forward.',
              color: '#E0F2FE',
            },
            {
              label: '5. In Progress',
              description: 'PDF is generated and order is prepared for fulfillment',
              color: '#F3E8FF',
            },
            {
              label: '6. Shipped',
              description: 'Order is fulfilled by Lulu and marked as shipped',
              color: '#DCFCE7',
            },
          ].map((status) => (
            <Box
              key={status.label}
              sx={{
                p: 2,
                bgcolor: status.color,
                borderRadius: '8px',
                border: '1px solid #E3E3E7',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#27272A', mb: 0.5 }}>
                {status.label}
              </Typography>
              <Typography variant="caption" sx={{ color: '#71717A', lineHeight: 1.4 }}>
                {status.description}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  )
}
