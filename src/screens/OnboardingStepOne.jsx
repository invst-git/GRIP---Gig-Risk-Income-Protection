import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'
import { ScreenHeader } from '../components/ScreenHeader'
import { StepDots } from '../components/StepDots'
import { InputField, PrimaryButton, SegmentedControl } from '../components/ui'
import { useGRIP } from '../context/GRIPContext'
import { cityOptions } from '../data/appData'
import { checkMobileExists } from '../services/registrationService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const ADULT_MAX_DATE = new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split('T')[0]

const GENDER_OPTIONS = [
  { label: 'Male', value: 'Male' },
  { label: 'Female', value: 'Female' },
  { label: 'Other', value: 'Other' },
]

const LANGUAGE_OPTIONS = [
  { label: 'Select language', value: '' },
  { label: 'English', value: 'English' },
  { label: 'Hindi', value: 'Hindi' },
  { label: 'Kannada', value: 'Kannada' },
  { label: 'Tamil', value: 'Tamil' },
  { label: 'Telugu', value: 'Telugu' },
  { label: 'Marathi', value: 'Marathi' },
]

function sanitizeDigits(value, maxLength) {
  return value.replace(/\D/g, '').slice(0, maxLength)
}

export function OnboardingStepOne() {
  const navigate = useNavigate()
  const { onboardingForm, updateOnboardingField } = useGRIP()
  const [errors, setErrors] = useState({})
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(onboardingForm.otpVerified)
  const [otpError, setOtpError] = useState(null)
  const [otpMessage, setOtpMessage] = useState(null)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)

  const citySelectOptions = useMemo(
    () => [{ label: 'Select city', value: '' }, ...cityOptions.map((city) => ({ label: city, value: city }))],
    [],
  )

  function updateForm(field, value) {
    if (field === 'mobileNumber') {
      setOtp('')
      setOtpSent(false)
      setOtpError(null)
      setOtpMessage(null)
      updateOnboardingField('otpVerified', false)
    }
    if (field === 'fullName') {
      updateOnboardingField('panVerified', false)
      updateOnboardingField('panMasked', '')
    }
    if (field === 'dateOfBirth') {
      updateOnboardingField('dlVerified', false)
      updateOnboardingField('dlMasked', '')
    }

    updateOnboardingField(field, value)
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  async function handleSendOTP() {
    if (onboardingForm.mobileNumber.length !== 10) {
      setErrors((current) => ({
        ...current,
        mobileNumber: 'Enter a valid 10-digit mobile number',
      }))
      return
    }

    setSendingOtp(true)
    setOtpError(null)
    setOtpMessage(null)

    try {
      const response = await fetch(`${API_BASE_URL}/kyc/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile_number: onboardingForm.mobileNumber }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'OTP could not be sent')
      }

      setOtpSent(true)
      setOtpMessage(data.message)
    } catch (error) {
      setOtpError(error.message || 'OTP could not be sent')
    } finally {
      setSendingOtp(false)
    }
  }

  async function handleVerifyOTP() {
    if (otp.length !== 4) {
      setOtpError('Enter the 4-digit OTP')
      return
    }

    setVerifyingOtp(true)
    setOtpError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/kyc/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile_number: onboardingForm.mobileNumber,
          otp,
        }),
      })
      const data = await response.json()

      if (!response.ok || !data.success || !data.verified) {
        throw new Error(data.error || 'OTP verification failed')
      }

      updateOnboardingField('otpVerified', true)
      setOtpError(null)
      setOtpMessage('Mobile number verified')
    } catch (error) {
      updateOnboardingField('otpVerified', false)
      setOtpError(error.message || 'OTP verification failed')
    } finally {
      setVerifyingOtp(false)
    }
  }

  async function handleContinue() {
    const nextErrors = {}

    if (!onboardingForm.fullName.trim()) nextErrors.fullName = 'This field is required'
    if (onboardingForm.mobileNumber.length !== 10) {
      nextErrors.mobileNumber = 'Enter a valid 10-digit mobile number'
    }
    if (!onboardingForm.otpVerified) nextErrors.mobileNumber = 'Verify your mobile number first'
    if (!onboardingForm.dateOfBirth) {
      nextErrors.dateOfBirth = 'This field is required'
    } else if (onboardingForm.dateOfBirth > ADULT_MAX_DATE) {
      nextErrors.dateOfBirth = 'You must be 18 years or older'
    }
    if (!onboardingForm.gender) nextErrors.gender = 'This field is required'
    if (!onboardingForm.language) nextErrors.language = 'This field is required'
    if (!onboardingForm.city) nextErrors.city = 'This field is required'

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    try {
      const alreadyExists = await checkMobileExists(onboardingForm.mobileNumber)

      if (alreadyExists) {
        setErrors({ mobileNumber: 'This number is already registered' })
        return
      }

      navigate('/onboarding/2')
    } catch {
      setErrors({ mobileNumber: 'Unable to verify this number right now' })
    }
  }

  return (
    <PageTransition className="flex min-h-full flex-col">
      <ScreenHeader title="Step 1 of 6" backTo="/" align="center" />
      <StepDots activeStep={1} totalSteps={6} />

      <div className="flex-1 overflow-y-auto px-4 pb-5 pt-5 sm:px-5 sm:pb-6 sm:pt-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="font-display text-[24px] font-normal text-text-primary">
              Personal details
            </h1>
            <p className="text-[14px] text-text-secondary">
              We start with identity basics and a mobile OTP check before policy setup.
            </p>
          </div>

          <div className="space-y-4">
            <InputField
              label="Full Name"
              placeholder=""
              value={onboardingForm.fullName}
              onChange={(event) => updateForm('fullName', event.target.value)}
              error={errors.fullName}
            />

            <div className="space-y-3">
              <InputField
                label="Mobile Number"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder=""
                value={onboardingForm.mobileNumber}
                onChange={(event) =>
                  updateForm('mobileNumber', sanitizeDigits(event.target.value, 10))
                }
                error={errors.mobileNumber}
              />

              {!onboardingForm.otpVerified ? (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    disabled={sendingOtp || otpSent || onboardingForm.mobileNumber.length < 10}
                    className="text-xs text-amber-600 underline disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sendingOtp ? 'Sending OTP...' : otpSent ? 'OTP sent' : 'Send OTP'}
                  </button>
                  {otpMessage ? (
                    <p className="text-xs text-text-secondary">{otpMessage}</p>
                  ) : null}
                </div>
              ) : null}

              {otpSent && !onboardingForm.otpVerified ? (
                <div className="space-y-3">
                  <InputField
                    label="Enter OTP"
                    placeholder="4-digit OTP"
                    maxLength={4}
                    value={otp}
                    onChange={(event) => setOtp(sanitizeDigits(event.target.value, 4))}
                    note="Use 1234 in demo mode"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOTP}
                    disabled={verifyingOtp || otp.length !== 4}
                    className="text-xs text-amber-600 underline disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {verifyingOtp ? 'Verifying OTP...' : 'Verify OTP'}
                  </button>
                </div>
              ) : null}

              {onboardingForm.otpVerified ? (
                <p className="text-xs text-green-600">Mobile verified</p>
              ) : null}
              {otpError ? <p className="text-xs text-red-400">{otpError}</p> : null}
            </div>

            <div className="space-y-2">
              <InputField
                label="Date of Birth"
                type="date"
                placeholder=""
                value={onboardingForm.dateOfBirth}
                onChange={(event) => updateForm('dateOfBirth', event.target.value)}
                max={ADULT_MAX_DATE}
                error={errors.dateOfBirth}
              />
              <p className="pl-1 text-[12px] text-text-secondary">Must be 18 years or older</p>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                Gender
              </label>
              <SegmentedControl
                options={GENDER_OPTIONS}
                value={onboardingForm.gender}
                onChange={(value) => updateForm('gender', value)}
              />
              {errors.gender ? (
                <p className="text-[12px] text-accent-danger">{errors.gender}</p>
              ) : null}
            </div>

            <InputField
              label="Preferred Language"
              as="select"
              value={onboardingForm.language}
              onChange={(event) => updateForm('language', event.target.value)}
              options={LANGUAGE_OPTIONS}
              error={errors.language}
            />

            <InputField
              label="City"
              as="select"
              value={onboardingForm.city}
              onChange={(event) => updateForm('city', event.target.value)}
              options={citySelectOptions}
              error={errors.city}
            />
          </div>
        </div>
      </div>

      <div className="px-4 pb-5 pt-2 sm:px-5 sm:pb-6">
        <PrimaryButton onClick={handleContinue} disabled={!onboardingForm.otpVerified}>
          Continue
        </PrimaryButton>
      </div>
    </PageTransition>
  )
}
