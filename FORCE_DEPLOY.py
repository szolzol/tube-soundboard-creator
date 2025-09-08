# Railway Deployment Force Refresh
# This file is to force Railway to redeploy with the latest code
# Created at: 2025-09-08 08:50 UTC

DEPLOYMENT_VERSION = "2025-09-08-force-redeploy-v2"

# The issue: Railway appears to not be using the latest code
# Evidence: Debug endpoints return 404, still getting "too many values to unpack" error
# Expected: extract_audio_segment should return 3 values, not 2
