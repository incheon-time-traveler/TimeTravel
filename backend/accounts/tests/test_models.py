from django.test import TestCase
from django.contrib.auth import get_user_model

# Create your tests here.
class UserTest(TestCase):

    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='testuser',
            useremail='testuser@example.com',
            password='testpassword'
        )
        
    def test_user_creation(self):
        self.assertEqual(self.user.useremail, 'testuser@example.com')
        self.assertEqual(self.user.username, 'testuser')
        self.assertEqual(self.user.nickname, 'testuser')
        self.assertTrue(self.user.check_password('testpassword'))

    def test_username_field_override(self):
        self.assertEqual(get_user_model().USERNAME_FIELD, 'useremail')

    def test_required_fields(self):
        self.assertEqual(get_user_model().REQUIRED_FIELDS, ['username'])