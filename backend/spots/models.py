from django.db import models

# Create your models here.
class Spot(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    description = models.TextField()
    lat = models.FloatField()
    lng = models.FloatField()
    era = models.CharField(max_length=50)


class SpotPhoto(models.Model):
    id = models.AutoField(primary_key=True)
    spot = models.ForeignKey(Spot, on_delete=models.CASCADE, related_name='photos')
    image = models.ImageField(upload_to='spot_photos/')
    name = models.CharField(max_length=100)