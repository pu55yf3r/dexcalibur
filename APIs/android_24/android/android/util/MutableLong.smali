.class public final Landroid/util/MutableLong;
.super Ljava/lang/Object;
.source "MutableLong.java"


# instance fields
.field public value:J


# direct methods
.method public constructor <init>(J)V
    .locals 2
    .param p1, "value"    # J

    .prologue
    .line 4
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    new-instance v0, Ljava/lang/RuntimeException;

    const-string v1, "Stub!"

    invoke-direct {v0, v1}, Ljava/lang/RuntimeException;-><init>(Ljava/lang/String;)V

    throw v0
.end method
