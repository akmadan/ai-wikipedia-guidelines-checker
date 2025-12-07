"""
Test script for WikiAssist backend
Run this to verify the backend is working correctly
"""

import requests

# Test data
test_content = """
Climate change is the best and most important issue of our time. Everyone knows that 
fossil fuels are destroying the planet. Scientists have proven that we need to act now 
before it's too late. The evidence is overwhelming and undeniable.
"""


def test_health_check():
    """Test the health check endpoint"""
    print("Testing health check endpoint...")
    try:
        response = requests.get("http://localhost:8000/api/health")
        if response.status_code == 200:
            print("✅ Health check passed!")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ Health check failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error connecting to backend: {e}")
        print("   Make sure the backend is running on http://localhost:8000")
        return False


def test_review_endpoint():
    """Test the review endpoint"""
    print("\nTesting review endpoint...")
    try:
        payload = {"content": test_content, "title": "Climate Change Test Article"}

        print("Sending content for review...")
        response = requests.post(
            "http://localhost:8000/api/review",
            json=payload,
            headers={"Content-Type": "application/json"},
        )

        if response.status_code == 200:
            data = response.json()
            print("✅ Review endpoint passed!")
            print("\n📊 Results:")
            print(f"   Overall Score: {data['overall_score']}/100")
            print(f"   Is Ready: {data['is_ready']}")
            print(f"   Summary: {data['summary']}")
            print(f"   Issues Found: {len(data['feedbacks'])}")

            if data["feedbacks"]:
                print("\n📋 Sample Feedback:")
                fb = data["feedbacks"][0]
                print(f"   Type: {fb['issue_type']}")
                print(f"   Severity: {fb['severity']}")
                print(f"   Original: {fb['original_sentence'][:50]}...")
                print(f"   Feedback: {fb['feedback'][:80]}...")

            return True
        else:
            print(f"❌ Review failed with status {response.status_code}")
            print(f"   Response: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Error during review: {e}")
        return False


def main():
    print("=" * 60)
    print("WikiAssist Backend Test Suite")
    print("=" * 60)

    # Test health check
    health_ok = test_health_check()

    if not health_ok:
        print("\n❌ Backend is not running. Please start it first:")
        print("   cd backend")
        print("   source venv/bin/activate")
        print("   python main.py")
        return

    # Test review endpoint
    print("\n⚠️  Note: This test requires a valid OpenAI API key in backend/.env")
    print("   If you haven't set it up yet, this test will fail.")
    input("\nPress Enter to continue with the review test...")

    review_ok = test_review_endpoint()

    print("\n" + "=" * 60)
    if health_ok and review_ok:
        print("✅ All tests passed! Backend is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the output above.")
    print("=" * 60)


if __name__ == "__main__":
    main()
