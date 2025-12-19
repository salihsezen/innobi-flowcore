/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    experimental: {
        transpilePackages: ['@automation/shared', 'lucide-react']
    }
}

module.exports = nextConfig
