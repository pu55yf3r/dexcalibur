.class public final Landroid/media/NotProvisionedException;
.super Landroid/media/MediaDrmException;
.source "NotProvisionedException.java"


# direct methods
.method public constructor <init>(Ljava/lang/String;)V
    .locals 2
    .param p1, "detailMessage"    # Ljava/lang/String;

    .prologue
    .line 5
    const/4 v0, 0x0

    check-cast v0, Ljava/lang/String;

    invoke-direct {p0, v0}, Landroid/media/MediaDrmException;-><init>(Ljava/lang/String;)V

    new-instance v0, Ljava/lang/RuntimeException;

    const-string v1, "Stub!"

    invoke-direct {v0, v1}, Ljava/lang/RuntimeException;-><init>(Ljava/lang/String;)V

    throw v0
.end method
